import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export interface Profile {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  email: string;
}

export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  role: "owner" | "admin" | "member";
}

/**
 * The signed-in user, or null.
 *
 * `getUser()` rather than `getSession()`: the session cookie is supplied
 * by the client and can be forged, so on the server only the token
 * revalidated against the auth server means anything.
 *
 * Wrapped in `cache` so a page that reads the user in the layout, the
 * page and a component makes one request, not three.
 */
export const getCurrentUser = cache(async () => {
  // Without credentials there is no auth server to ask. Returning null
  // rather than constructing a client lets the setup gate render instead
  // of a 500 from inside the auth library.
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? "",
    // The row is created by a trigger, but a profile read can still race a
    // brand-new signup — fall back rather than render a broken shell.
    fullName: data?.full_name ?? "",
    avatarUrl: data?.avatar_url ?? null,
  };
});

/** Workspaces the caller belongs to. RLS does the filtering, not this query. */
export const getWorkspaces = cache(async (): Promise<WorkspaceSummary[]> => {
  if (!isSupabaseConfigured) return [];
  const user = await getCurrentUser();
  if (!user) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspace_members")
    .select("role, workspaces (id, name, slug)")
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  return data.flatMap((row) => {
    const ws = row.workspaces as unknown as { id: string; name: string; slug: string } | null;
    if (!ws) return [];
    return [{ id: ws.id, name: ws.name, slug: ws.slug, role: row.role as WorkspaceSummary["role"] }];
  });
});

/**
 * Guard for protected pages.
 *
 * The middleware already redirects unauthenticated requests, but this is
 * repeated at the data layer on purpose: middleware can be bypassed by a
 * matcher change or a direct server-side call, and a page that assumes a
 * user without checking would leak whatever it renders.
 */
export async function requireUser() {
  // An unconfigured install has no sign-in to send anyone to — `/` shows
  // the setup instructions, which is the only useful destination.
  if (!isSupabaseConfigured) redirect("/");
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Guard for pages that need a workspace. A signed-in user with none is
 * sent to onboarding rather than shown an empty shell.
 */
export async function requireWorkspace() {
  await requireUser();
  const workspaces = await getWorkspaces();
  if (workspaces.length === 0) redirect("/onboarding");
  return workspaces;
}
