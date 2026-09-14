import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { reportReadError } from "./report";
import { getCurrentWorkspace } from "./queries";
import { getCurrentUser } from "@/lib/auth/session";
import type { PermissionLevel } from "./permissions";
import type { SpaceColor } from "./types";

/**
 * Who can reach what, read from the database.
 *
 * The People & Permissions screen was built against sample people while
 * the model was being designed. The model is real now — `space_members`
 * carries the level, `project_members.level` overrides it per project —
 * so the screen reads this instead.
 *
 * Everything is loaded in four flat queries and stitched together here.
 * The alternative, a query per space and another per project, turns a
 * workspace with six spaces into thirty round trips to draw one page.
 */

export interface PersonRow {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  /** Their standing in the workspace itself. */
  role: "owner" | "admin" | "member";
}

export interface ProjectAccessRow {
  personId: string;
  level: PermissionLevel;
}

export interface ProjectRow {
  id: string;
  name: string;
  slug: string;
  /** Explicit per-project grants. Anybody not here inherits the space. */
  overrides: ProjectAccessRow[];
}

export interface SpaceRow {
  id: string;
  name: string;
  slug: string;
  color: SpaceColor;
  icon: string;
  members: { personId: string; level: PermissionLevel }[];
  projects: ProjectRow[];
  /** Whether the person reading this page may change any of it. */
  canManage: boolean;
}

export interface PermissionsOverview {
  workspaceName: string;
  viewerId: string;
  viewerIsAdmin: boolean;
  people: PersonRow[];
  spaces: SpaceRow[];
}

export const EMPTY_OVERVIEW: PermissionsOverview = {
  workspaceName: "Workspace",
  viewerId: "",
  viewerIsAdmin: false,
  people: [],
  spaces: [],
};

export const getPermissionsOverview = cache(async (): Promise<PermissionsOverview> => {
  const [user, workspace] = await Promise.all([getCurrentUser(), getCurrentWorkspace()]);
  if (!user || !workspace) return EMPTY_OVERVIEW;

  const supabase = await createClient();

  const [
    { data: memberRows, error: memberError },
    { data: spaceRows, error: spaceError },
    { data: projectRows, error: projectError },
  ] = await Promise.all([
    supabase
      .from("workspace_members")
      .select("user_id, role")
      .eq("workspace_id", workspace.id),
    supabase
      .from("spaces")
      .select("id, name, slug, color, icon")
      .eq("workspace_id", workspace.id)
      .is("archived_at", null)
      .order("position", { ascending: true }),
    supabase
      .from("projects")
      .select("id, name, slug, space_id")
      .eq("workspace_id", workspace.id)
      .is("archived_at", null)
      .order("name", { ascending: true }),
  ]);

  reportReadError("permissions:members", memberError);
  reportReadError("permissions:spaces", spaceError);
  reportReadError("permissions:projects", projectError);

  const members = (memberRows ?? []) as { user_id: string; role: PersonRow["role"] }[];
  if (members.length === 0) return EMPTY_OVERVIEW;

  /*
    Names and addresses are read separately rather than embedded.

    `workspace_members` reaches `profiles` by one column and `users` not
    at all, but an embed would still be one more thing that can silently
    empty this whole page — which has happened three times in this
    project already.
  */
  const { data: profileRows, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", members.map((row) => row.user_id));
  reportReadError("permissions:profiles", profileError);

  const profiles = new Map(
    ((profileRows ?? []) as { id: string; full_name: string; avatar_url: string | null }[]).map(
      (row) => [row.id, row]
    )
  );

  const people: PersonRow[] = members
    .map((row) => ({
      id: row.user_id,
      name: profiles.get(row.user_id)?.full_name || "Unknown",
      // Addresses live on auth.users, which this client cannot read.
      // The name is what the screen identifies people by anyway.
      email: "",
      avatarUrl: profiles.get(row.user_id)?.avatar_url ?? null,
      role: row.role,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const spaces = (spaceRows ?? []) as {
    id: string; name: string; slug: string; color: SpaceColor; icon: string;
  }[];
  const projects = (projectRows ?? []) as {
    id: string; name: string; slug: string; space_id: string;
  }[];

  const [{ data: spaceMemberRows, error: spaceMemberError }, { data: overrideRows, error: overrideError }] =
    await Promise.all([
      supabase
        .from("space_members")
        .select("space_id, user_id, level")
        .eq("workspace_id", workspace.id),
      // Only rows carrying an explicit level are overrides; a plain
      // roster row with a null level is somebody inheriting the space.
      supabase
        .from("project_members")
        .select("project_id, user_id, level")
        .not("level", "is", null)
        .in("project_id", projects.map((project) => project.id).concat("00000000-0000-0000-0000-000000000000")),
    ]);

  reportReadError("permissions:space-members", spaceMemberError);
  reportReadError("permissions:overrides", overrideError);

  const bySpace = new Map<string, { personId: string; level: PermissionLevel }[]>();
  for (const row of (spaceMemberRows ?? []) as {
    space_id: string; user_id: string; level: PermissionLevel;
  }[]) {
    const list = bySpace.get(row.space_id);
    const entry = { personId: row.user_id, level: row.level };
    if (list) list.push(entry);
    else bySpace.set(row.space_id, [entry]);
  }

  const byProject = new Map<string, ProjectAccessRow[]>();
  for (const row of (overrideRows ?? []) as {
    project_id: string; user_id: string; level: PermissionLevel;
  }[]) {
    const list = byProject.get(row.project_id);
    const entry = { personId: row.user_id, level: row.level };
    if (list) list.push(entry);
    else byProject.set(row.project_id, [entry]);
  }

  const viewerIsAdmin = workspace.role === "owner" || workspace.role === "admin";

  return {
    workspaceName: workspace.name,
    viewerId: user.id,
    viewerIsAdmin,
    people,
    spaces: spaces.map((space) => {
      const spaceMembers = bySpace.get(space.id) ?? [];
      return {
        id: space.id,
        name: space.name,
        slug: space.slug,
        color: space.color,
        icon: space.icon,
        members: spaceMembers,
        projects: projects
          .filter((project) => project.space_id === space.id)
          .map((project) => ({
            id: project.id,
            name: project.name,
            slug: project.slug,
            overrides: byProject.get(project.id) ?? [],
          })),
        // The same rule `can_manage_space` applies in the database: a
        // workspace admin, or an admin of this one space.
        canManage:
          viewerIsAdmin ||
          spaceMembers.some((member) => member.personId === user.id && member.level === "admin"),
      };
    }),
  };
});
