/**
 * The permission model.
 *
 * The vocabulary and the copy — what each level is called and what it
 * lets somebody do. The sample people that used to live here are gone:
 * the People & Permissions screen reads the real workspace now, and
 * `project_level()` in the database resolves what somebody may do.
 *
 * This file stays because the LABELS belong in one place. A screen that
 * spells out "Can view and comment, but not change" in three components
 * eventually spells it three different ways.
 *
 * The hierarchy is Workspace → Space → Project → Task. Permission is
 * granted at any level and RESOLVED downwards: the most specific grant
 * wins, which is what lets one person be an Editor on one project and a
 * Viewer on the next without touching their standing anywhere else.
 */

export type PermissionLevel = "admin" | "editor" | "commenter" | "viewer";

/** Ordered weakest to strongest, so levels can be compared. */
export const PERMISSION_ORDER: PermissionLevel[] = ["viewer", "commenter", "editor", "admin"];

export const PERMISSION_META: Record<
  PermissionLevel,
  { label: string; summary: string; can: string[]; tone: string }
> = {
  admin: {
    label: "Admin",
    summary: "Full control, including members and settings",
    can: ["Everything an editor can", "Add and remove members", "Change permissions", "Delete the project"],
    tone: "bg-primary-muted text-primary ring-primary/40",
  },
  editor: {
    label: "Editor",
    summary: "Can create and change content",
    can: ["Everything a commenter can", "Create and edit tasks", "Upload files", "Edit documents"],
    tone: "bg-info-subtle text-info ring-info/40",
  },
  commenter: {
    label: "Commenter",
    summary: "Can view and comment, but not change",
    can: ["Everything a viewer can", "Comment on tasks", "React to messages"],
    tone: "bg-warning-subtle text-warning ring-warning/40",
  },
  viewer: {
    label: "Viewer",
    summary: "Read-only",
    can: ["See tasks, documents and files", "See who is on the project"],
    tone: "bg-surface-elevated text-text-secondary ring-border",
  },
};

/**
 * Who can reach a project at all, before permission levels are considered.
 *
 * These are three different questions, not three strengths of one — a
 * private project is not "a stricter workspace project", it has a
 * different list of people entirely.
 */
export type ProjectVisibility = "workspace" | "space" | "private";

export const VISIBILITY_META: Record<
  ProjectVisibility,
  { label: string; description: string }
> = {
  workspace: {
    label: "Anyone in the workspace",
    description: "Everybody in Tyriaq can find and open this project.",
  },
  space: {
    label: "Space members only",
    description: "People in the parent space, plus anybody added directly.",
  },
  private: {
    label: "Private",
    description: "Only the people listed here. It will not appear for anybody else.",
  },
};

/**
 * Where a permission came from.
 *
 * Shown beside the level, because "Editor" alone does not tell somebody
 * whether taking them out of the space would change anything — and that
 * is usually the question being asked of a permissions screen.
 */
export type PermissionSource = "workspace" | "space" | "project" | "none";
