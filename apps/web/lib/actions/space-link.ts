"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import type { PermissionLevel } from "@/lib/data/permissions";
import type { SpaceColor } from "@/lib/data/types";
import { reportReadError } from "@/lib/data/report";
import type { ActionResult } from "./workspace";

/**
 * Join links, and the requests they produce.
 *
 * A space admin copies one link and sends it however they already talk
 * to people. Whoever opens it asks to join; an admin approves, and
 * approval does the whole thing at once — workspace membership if they
 * need it, then the space at the chosen level.
 *
 * The link is not an entry. Holding it lets you ASK, which is cheap and
 * reversible: a link that got forwarded produces requests somebody has
 * to look at, never members nobody chose.
 */

// Not exported: a "use server" module may only export async functions,
// and every export becomes a callable endpoint.
function siteUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined);
  return (configured ?? "http://localhost:3000").replace(/\/+$/, "");
}

function joinUrl(token: string): string {
  return `${siteUrl()}/join/${token}`;
}

export interface JoinRequest {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  note: string;
  createdAt: string;
}

/**
 * The space's link, minted on first use.
 *
 * Creating it on demand rather than with the space means a space that
 * nobody ever shares never has a live token — and the button that asks
 * for one is the same button that copies it, so there is no separate
 * "generate" step to explain.
 */
export async function getSpaceJoinLink(spaceId: string): Promise<ActionResult & { url?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in first." };

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("space_invite_links")
    .select("token")
    .eq("space_id", spaceId)
    .is("revoked_at", null)
    .maybeSingle();
  if (existing?.token) return { url: joinUrl(existing.token) };

  /*
    The workspace is read from the space rather than passed in.

    Other membership tables take a placeholder here and have a trigger
    correct it; this table has no such trigger, so a placeholder was
    simply a foreign key to a workspace that does not exist — and the
    failure came back as "only an admin can share a space", to a person
    who was the owner.
  */
  const { data: space } = await supabase
    .from("spaces")
    .select("workspace_id")
    .eq("id", spaceId)
    .maybeSingle();
  if (!space) return { error: "That space no longer exists." };

  const { data, error } = await supabase
    .from("space_invite_links")
    .insert({ space_id: spaceId, workspace_id: space.workspace_id, created_by: user.id })
    .select("token")
    .single();

  if (error || !data) {
    // The insert policy is `can_manage_space`, so this IS usually a
    // permission refusal — but not always, and saying so blindly sent
    // the last one to the wrong person.
    console.error("[tyriaq] could not mint a space link:", error);
    return {
      error:
        error?.code === "42501"
          ? "Only a space or workspace admin can share a space."
          : "Could not make a link. Please try again.",
    };
  }
  return { url: joinUrl(data.token) };
}

/**
 * Turns off the current link and mints a new one.
 *
 * One live link per space is a partial unique index, so the old row has
 * to be revoked before the new one can exist — which is exactly the
 * behaviour worth having: the link sent last week stops working, and
 * there is no second one still open that nobody remembers.
 */
export async function resetSpaceJoinLink(spaceId: string): Promise<ActionResult & { url?: string }> {
  const supabase = await createClient();

  const { error: revokeError } = await supabase
    .from("space_invite_links")
    .update({ revoked_at: new Date().toISOString() })
    .eq("space_id", spaceId)
    .is("revoked_at", null);
  if (revokeError) return { error: "Only a space or workspace admin can do that." };

  const result = await getSpaceJoinLink(spaceId);
  if (result.url) return { ...result, message: "New link ready — the old one no longer works." };
  return result;
}

/**
 * Everyone waiting on a decision for this space.
 *
 * Two queries and no embed, deliberately. Two columns here reach
 * `profiles` — who asked, and who decided — so an embed has to be
 * hinted, and an unhinted one makes PostgREST refuse the ENTIRE query
 * rather than the join. That is how this shipped showing "nobody has
 * asked" while somebody was waiting, and it is the third time in this
 * project that an ambiguous embed has silently emptied a list.
 *
 * Reading the names separately cannot fail that way. It costs one extra
 * round trip on a list that is almost always empty or tiny.
 */
export async function listJoinRequests(spaceId: string): Promise<JoinRequest[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("space_join_requests")
    .select("id, user_id, note, created_at")
    .eq("space_id", spaceId)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  // Silence is how the ambiguity above went unnoticed: a failed read and
  // an empty queue look identical on screen unless one of them says so.
  reportReadError("listJoinRequests", error);

  const rows = (data ?? []) as { id: string; user_id: string; note: string; created_at: string }[];
  if (rows.length === 0) return [];

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", rows.map((row) => row.user_id));
  reportReadError("listJoinRequests:profiles", profileError);

  const byId = new Map(
    ((profiles ?? []) as { id: string; full_name: string; avatar_url: string | null }[]).map(
      (profile) => [profile.id, profile]
    )
  );

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    name: byId.get(row.user_id)?.full_name || "Someone",
    // A requester is not in the workspace yet, so there is no address to
    // show them by — only the name they signed up with.
    email: "",
    avatarUrl: byId.get(row.user_id)?.avatar_url ?? null,
    note: row.note,
    createdAt: row.created_at,
  }));
}

export async function decideJoinRequest(
  requestId: string,
  approve: boolean,
  level: PermissionLevel = "editor",
  projectLevels: Record<string, PermissionLevel> = {}
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_space_join", {
    request_id: requestId,
    approve,
    level,
    project_levels: projectLevels,
  });

  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { message: approve ? "They are in." : "Request declined." };
}

export interface ProjectAccessRow {
  projectId: string;
  projectName: string;
  /** Null means they inherit whatever the space grants. */
  level: PermissionLevel | null;
}

/** Who can reach which project in this space, and how. */
export async function getProjectAccess(
  spaceId: string,
  userId: string
): Promise<ProjectAccessRow[]> {
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name")
    .eq("space_id", spaceId)
    .is("archived_at", null)
    .order("name", { ascending: true });

  const { data: rows } = await supabase
    .from("project_members")
    .select("project_id, level")
    .eq("user_id", userId);

  const byProject = new Map(
    ((rows ?? []) as { project_id: string; level: PermissionLevel | null }[]).map((row) => [
      row.project_id,
      row.level,
    ])
  );

  return ((projects ?? []) as { id: string; name: string }[]).map((project) => ({
    projectId: project.id,
    projectName: project.name,
    level: byProject.get(project.id) ?? null,
  }));
}

/**
 * Changes one person's access to one project, afterwards.
 *
 * Passing null puts them back to inheriting the space level rather than
 * removing them — those are different intentions, and a screen that
 * conflated them would drop people off projects by accident.
 */
export async function setProjectLevel(
  projectId: string,
  userId: string,
  level: PermissionLevel | null
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_project_level", {
    p_project: projectId,
    p_user: userId,
    p_level: level,
  });

  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return {};
}

/* ------------------------------------------------------------------ */
/* The other side of the link                                          */
/* ------------------------------------------------------------------ */

export interface JoinPreview {
  spaceId: string;
  spaceName: string;
  spaceIcon: string;
  spaceColor: SpaceColor;
  workspaceName: string;
  inviterName: string;
  memberCount: number;
  revoked: boolean;
  alreadyMember: boolean;
  pending: boolean;
}

export async function previewJoinLink(token: string): Promise<JoinPreview | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("space_link_preview", { link_token: token });

  const row = (Array.isArray(data) ? data[0] : data) as
    | {
        space_id: string; space_name: string; space_icon: string; space_color: SpaceColor;
        workspace_name: string; inviter_name: string; member_count: number;
        is_revoked: boolean; already_member: boolean; pending_request: boolean;
      }
    | undefined;
  if (!row) return null;

  return {
    spaceId: row.space_id,
    spaceName: row.space_name,
    spaceIcon: row.space_icon,
    spaceColor: row.space_color,
    workspaceName: row.workspace_name,
    inviterName: row.inviter_name,
    memberCount: row.member_count,
    revoked: row.is_revoked,
    alreadyMember: row.already_member,
    pending: row.pending_request,
  };
}

export async function requestToJoin(token: string, note: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_space_join", {
    link_token: token,
    request_note: note.trim().slice(0, 300),
  });

  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { message: "Asked. You will hear when somebody decides." };
}
