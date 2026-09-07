"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/data/queries";
import { slugify } from "@/lib/data/types";

export interface ActionResult {
  error?: string;
  message?: string;
}

/**
 * Workspace mutations.
 *
 * Every one revalidates the root layout, not just the calling page: the
 * sidebar renders workspaces and spaces on every screen, so a change that
 * only refreshed the current route would leave the rail stale until the
 * next full navigation.
 */

async function uniqueWorkspaceSlug(supabase: Awaited<ReturnType<typeof createClient>>, base: string) {
  let slug = base;
  for (let n = 2; n <= 25; n++) {
    const { data: free } = await supabase.rpc("workspace_slug_available", { candidate: slug });
    if (free) return slug;
    slug = `${base}-${n}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function createWorkspace(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Give your workspace a name." };
  if (name.length > 80) return { error: "That name is too long." };

  const base = slugify(name);
  if (!base) return { error: "Use at least one letter or number." };

  const supabase = await createClient();
  const slug = await uniqueWorkspaceSlug(supabase, base);

  // Through the RPC, never a direct insert: `workspaces` has no INSERT
  // policy because the workspace and its owner membership must be written
  // together or the row is invisible to everyone, including its creator.
  const { error } = await supabase.rpc("create_workspace", {
    workspace_name: name,
    workspace_slug: slug,
  });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function renameWorkspace(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Workspace name cannot be empty." };
  if (name.length > 80) return { error: "That name is too long." };

  const ws = await getCurrentWorkspace();
  if (!ws) return { error: "No workspace selected." };

  const supabase = await createClient();
  // The slug is left alone on purpose — it is part of URLs people may
  // already have shared, and renaming should not break their links.
  const { error } = await supabase.from("workspaces").update({ name }).eq("id", ws.id);

  // RLS restricts UPDATE to admins, so a member gets zero rows rather than
  // an error. Reporting success in that case would be a lie.
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { message: "Workspace renamed." };
}
