/**
 * Domain-level types for the auth + workspace foundation (Phase 02).
 * These mirror the Supabase schema (see supabase/migrations) and are the
 * single shared source for Web and Mobile — never redefine these
 * independently per platform.
 */

export const WORKSPACE_ROLES = ["owner", "admin", "member", "guest"] as const;

/** Matches the `workspace_role` Postgres enum. */
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

/** Mirrors the `profiles` table. `id` is the Supabase Auth user id. */
export interface UserProfile {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Mirrors the `workspaces` table. */
export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  avatarUrl: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/** Mirrors the `workspace_members` table. */
export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  joinedAt: string;
}

/** A workspace joined with the current user's membership row — the
 * shape the workspace switcher and onboarding flow work with. */
export interface WorkspaceWithMembership extends Workspace {
  role: WorkspaceRole;
}
