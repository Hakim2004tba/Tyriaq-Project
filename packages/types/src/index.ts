/**
 * @flow/types
 *
 * Foundation types shared by the Design System and domain models. Status
 * and priority here match the real `tasks` table (Phase 04) — these
 * started as Phase 01 design-system placeholders and are now the actual
 * domain vocabulary, so there is exactly one status/priority system
 * rather than a UI copy and a domain copy.
 */

// ---------------------------------------------------------------------------
// Task status — used by <TaskStatus /> and status-driven UI everywhere.
// Text/icon pairing is required alongside color (accessibility rule).
// Matches the `task_status` Postgres enum. Order is meaningful: it is
// the left-to-right order of Board columns, the status dropdown, and
// the stats strip, all of which map over this array. Project-specific
// custom statuses remain a documented future extension (see
// supabase/migrations README) — 'review' is here because it is a stage
// of the one fixed workflow every project shares, not a per-project
// customization.
// ---------------------------------------------------------------------------
export const TASK_STATUSES = ["todo", "in_progress", "review", "done"] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

// ---------------------------------------------------------------------------
// Task priority — used by <PriorityBadge />. Matches the `task_priority`
// Postgres enum. "none" is a real, selectable priority (not the absence
// of a value) so every task always has an explicit priority.
// ---------------------------------------------------------------------------
export const TASK_PRIORITIES = ["none", "low", "medium", "high", "urgent"] as const;

export type TaskPriority = (typeof TASK_PRIORITIES)[number];

// ---------------------------------------------------------------------------
// Generic person reference — used by <Avatar />, <UserPresence />,
// assignment UI, activity items, comments.
// ---------------------------------------------------------------------------
export interface PersonRef {
  id: string;
  name: string;
  avatarUrl?: string | null;
  /** Presence is a UI concept in Phase 01; realtime wiring comes later. */
  presence?: "online" | "away" | "offline";
}

// ---------------------------------------------------------------------------
// Generic entity refs for product-specific UI primitives
// (ProjectBadge, DocumentItem, TimelineItem, FileItem, ActivityItem).
// These are intentionally minimal — just enough shape to render a card.
// ---------------------------------------------------------------------------
export interface ProjectRef {
  id: string;
  name: string;
  color?: string;
  icon?: string;
}

export interface DocumentRef {
  id: string;
  title: string;
  updatedAt: string;
}

export interface FileRef {
  id: string;
  name: string;
  sizeBytes: number;
  mimeType: string;
}

export interface ActivityRef {
  id: string;
  actor: PersonRef;
  verb: string;
  target: string;
  timestamp: string;
}

export interface CommentRef {
  id: string;
  author: PersonRef;
  body: string;
  timestamp: string;
}

export interface TimelineEventRef {
  id: string;
  title: string;
  timestamp: string;
  kind?: "created" | "updated" | "decision" | "milestone" | "comment";
}

export * from "./workspace";
export * from "./project";
export * from "./task";
export * from "./document";
export * from "./comment";
export * from "./activity";
export * from "./attachment";
export * from "./notification";
export * from "./search";
export * from "./time-entry";
export * from "./custom-field";
export * from "./automation";
export * from "./project-template";
