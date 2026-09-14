import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { reportReadError } from "./report";
import { getCurrentUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Member, Project, ProjectRole, Space, Workspace } from "./types";

/**
 * Reads.
 *
 * None of these filter by workspace in application code — Row Level
 * Security already restricts every row to workspaces the caller belongs
 * to. Adding a redundant `.eq("workspace_id", …)` would look like the
 * security boundary and quietly become the only one the day somebody
 * removes a policy.
 *
 * Each is wrapped in `cache` so a layout, a page and a component that all
 * need the same list share one round trip per request.
 */

type ProfileRow = { id: string; full_name: string; avatar_url: string | null };

function toMember(
  p: ProfileRow | null | undefined,
  email = "",
  workspaceRole: Member["workspaceRole"] = "member"
): Member | null {
  if (!p) return null;
  return {
    id: p.id,
    name: p.full_name || email || "Unknown",
    email,
    avatarUrl: p.avatar_url,
    workspaceRole,
  };
}

export const getWorkspaces = cache(async (): Promise<Workspace[]> => {
  if (!isSupabaseConfigured) return [];
  const user = await getCurrentUser();
  if (!user) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspace_members")
    .select("role, workspaces(id, name, slug)")
    .order("created_at", { ascending: true });
  reportReadError("getWorkspaces", error);

  return (data ?? []).flatMap((row) => {
    const ws = row.workspaces as unknown as { id: string; name: string; slug: string } | null;
    return ws ? [{ id: ws.id, name: ws.name, slug: ws.slug, role: row.role as Workspace["role"] }] : [];
  });
});

/**
 * The workspace the UI is currently showing.
 *
 * Tyriaq has no workspace segment in its URLs yet, so "current" is the
 * first workspace you joined. When a switcher needs to persist a choice
 * this becomes a cookie read; every caller already goes through here, so
 * that change lands in one place.
 */
export const getCurrentWorkspace = cache(async (): Promise<Workspace | null> => {
  const workspaces = await getWorkspaces();
  return workspaces[0] ?? null;
});

export const getWorkspaceMembers = cache(async (): Promise<Member[]> => {
  const ws = await getCurrentWorkspace();
  if (!ws) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspace_members")
    .select("user_id, role, profiles(id, full_name, avatar_url)")
    .eq("workspace_id", ws.id);
  reportReadError("getWorkspaceMembers", error);

  return (data ?? []).flatMap((row) => {
    const m = toMember(row.profiles as unknown as ProfileRow | null);
    return m ? [{ ...m, workspaceRole: (row.role ?? "member") as Member["workspaceRole"] }] : [];
  });
});

export const getSpaces = cache(async (): Promise<Space[]> => {
  const ws = await getCurrentWorkspace();
  if (!ws) return [];

  const supabase = await createClient();
  const [{ data: spaces, error: spacesError }, { data: projects, error: countsError }] = await Promise.all([
    supabase
      .from("spaces")
      .select("id, workspace_id, name, slug, description, icon, color, position, archived_at")
      .order("position", { ascending: true })
      .order("created_at", { ascending: true }),
    // One extra query rather than N — a per-space count would issue a
    // request for every row in the sidebar.
    supabase.from("projects").select("space_id").is("archived_at", null),
  ]);
  reportReadError("getSpaces", spacesError);
  reportReadError("getSpaces:projectCounts", countsError);

  const counts = new Map<string, number>();
  for (const p of projects ?? []) {
    counts.set(p.space_id, (counts.get(p.space_id) ?? 0) + 1);
  }

  return (spaces ?? []).map((s) => ({
    id: s.id,
    workspaceId: s.workspace_id,
    name: s.name,
    slug: s.slug,
    description: s.description,
    icon: s.icon,
    color: s.color,
    archived: s.archived_at !== null,
    position: s.position,
    projectCount: counts.get(s.id) ?? 0,
  }));
});

export const getSpace = cache(async (slug: string): Promise<Space | null> => {
  const spaces = await getSpaces();
  return spaces.find((s) => s.slug === slug) ?? null;
});

const PROJECT_SELECT = `
  id, workspace_id, space_id, name, slug, description, status, color,
  start_date, due_date, archived_at, updated_at,
  spaces!inner(name, slug, color),
  project_members(role, profiles(id, full_name, avatar_url))
`;

type ProjectRow = {
  id: string;
  workspace_id: string;
  space_id: string;
  name: string;
  slug: string;
  description: string;
  status: Project["status"];
  color: Project["color"];
  start_date: string | null;
  due_date: string | null;
  archived_at: string | null;
  updated_at: string;
  spaces: { name: string; slug: string; color: Project["color"] } | null;
  project_members: { role: ProjectRole; profiles: ProfileRow | null }[] | null;
};

/**
 * Task counts for a set of projects, in ONE query.
 *
 * Only ids and statuses come back — enough to count, and small enough
 * that fetching them for a whole workspace costs less than asking the
 * database for a count per project.
 *
 * Subtasks are excluded: a parent with three subtasks would otherwise
 * count as four pieces of work in a progress bar that is meant to read
 * as "tasks done out of tasks".
 */
async function taskCounts(projectIds: string[]): Promise<Map<string, { total: number; done: number }>> {
  const counts = new Map<string, { total: number; done: number }>();
  if (projectIds.length === 0) return counts;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("project_id, status")
    .is("parent_task_id", null)
    .in("project_id", projectIds);
  reportReadError("taskCounts", error);

  for (const row of (data ?? []) as unknown as { project_id: string; status: string }[]) {
    const entry = counts.get(row.project_id) ?? { total: 0, done: 0 };
    entry.total += 1;
    if (row.status === "done") entry.done += 1;
    counts.set(row.project_id, entry);
  }
  return counts;
}

function toProject(row: ProjectRow, counts?: Map<string, { total: number; done: number }>): Project {
  const members = (row.project_members ?? []).flatMap((pm) => {
    const m = toMember(pm.profiles);
    return m ? [{ ...m, role: pm.role }] : [];
  });
  return {
    id: row.id,
    spaceId: row.space_id,
    workspaceId: row.workspace_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    status: row.status,
    color: row.color,
    startDate: row.start_date,
    dueDate: row.due_date,
    archived: row.archived_at !== null,
    updatedAt: row.updated_at,
    members,
    lead: members.find((m) => m.role === "lead") ?? null,
    taskCount: counts?.get(row.id)?.total ?? 0,
    doneCount: counts?.get(row.id)?.done ?? 0,
    spaceName: row.spaces?.name ?? "",
    spaceSlug: row.spaces?.slug ?? "",
    spaceColor: row.spaces?.color ?? row.color,
  };
}

export const getProjects = cache(async (): Promise<Project[]> => {
  const ws = await getCurrentWorkspace();
  if (!ws) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_SELECT)
    .order("updated_at", { ascending: false });
  reportReadError("getProjects", error);

  const rows = (data ?? []) as unknown as ProjectRow[];
  const counts = await taskCounts(rows.map((r) => r.id));
  return rows.map((row) => toProject(row, counts));
});

export const getProject = cache(async (slug: string): Promise<Project | null> => {
  const ws = await getCurrentWorkspace();
  if (!ws) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_SELECT)
    .eq("slug", slug)
    .maybeSingle();
  reportReadError("getProject", error);

  if (!data) return null;
  const row = data as unknown as ProjectRow;
  return toProject(row, await taskCounts([row.id]));
});

export const getProjectsBySpace = cache(async (): Promise<Map<string, Project[]>> => {
  const projects = await getProjects();
  const map = new Map<string, Project[]>();
  for (const p of projects) {
    const list = map.get(p.spaceId);
    if (list) list.push(p);
    else map.set(p.spaceId, [p]);
  }
  return map;
});
