/**
 * Project domain types (Phase 03). Mirrors supabase/migrations'
 * projects / project_members tables — see supabase/migrations/README.md
 * for the visibility decision (workspace-wide read, membership-gated
 * mutation).
 */

export const PROJECT_STATUSES = ["active", "completed", "archived"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_ROLES = ["lead", "member", "viewer"] as const;
export type ProjectRole = (typeof PROJECT_ROLES)[number];

/**
 * Controlled accent palette for a project's visual identity — always a
 * semantic token key, never an arbitrary hex value (brief section 23).
 * Matches the `project_color` Postgres enum.
 */
export const PROJECT_COLORS = ["purple", "info", "success", "warning", "danger", "neutral"] as const;
export type ProjectColor = (typeof PROJECT_COLORS)[number];

/** Mirrors the `projects` table. */
export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: ProjectColor;
  status: ProjectStatus;
  /** Set only once status transitions to 'archived' — null otherwise. */
  archivedAt: string | null;
  /** Freeform retrospective text (decisions/lessons learned/key
   * outcomes) — see supabase/migrations README for why this is one
   * field, not a structured sub-system. */
  archiveSummary: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/** Mirrors the `project_members` table. */
export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectRole;
  joinedAt: string;
}

/** A project member joined with enough profile data to render an avatar row. */
export interface ProjectMemberWithProfile extends ProjectMember {
  fullName: string | null;
  avatarUrl: string | null;
  email: string | null;
}

/** A project joined with the current user's membership row, if any
 * (projects are workspace-wide visible — a user can view a project
 * with no membership row, in which case `role` is null). */
export interface ProjectWithViewerRole extends Project {
  viewerRole: ProjectRole | null;
  memberCount: number;
}
