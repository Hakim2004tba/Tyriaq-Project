/**
 * Task domain types (Phase 04). Mirrors supabase/migrations' tasks /
 * task_assignees tables — see supabase/migrations/README.md for the
 * visibility/authorization decision.
 *
 * TaskStatus / TaskPriority live in ./index (they started as Phase 01
 * design-system placeholders and are now the real domain vocabulary —
 * see that file's header comment).
 */
import type { TaskStatus, TaskPriority } from "./index";

/** Mirrors the `tasks` table. */
export interface Task {
  id: string;
  projectId: string;
  /** Per-project sequential number (see set_task_number in migrations).
   * Combine with the project's slug for a human-friendly identifier,
   * e.g. `${project.slug.toUpperCase()}-${task.taskNumber}`. */
  taskNumber: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  startDate: string | null;
  dueDate: string | null;
  completedAt: string | null;
  /** Set for a subtask, one level deep only (a subtask can't itself
   * have subtasks — see supabase/migrations/README.md). */
  parentTaskId: string | null;
  /** Estimated effort in MINUTES, or null for no estimate. Format for
   * display with formatDuration() from @flow/utils — never render the
   * raw number. */
  timeEstimateMinutes: number | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/** Mirrors the `tags` table — a workspace-scoped, reusable label. */
export interface Tag {
  id: string;
  workspaceId: string;
  name: string;
  color: TagColor;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/** Matches the `project_color` Postgres enum, which `tags.color`
 * deliberately reuses so tags render from the same design tokens as
 * project badges (see supabase/migrations/20260819290200_task_tags.sql). */
export const TAG_COLORS = ["purple", "info", "success", "warning", "danger", "neutral"] as const;
export type TagColor = (typeof TAG_COLORS)[number];

/** Matches the `dependency_type` Postgres enum. "blocked_by" is
 * deliberately not a stored value — see supabase/migrations README —
 * it's computed by TaskDependencySummary.direction below. */
export const DEPENDENCY_TYPES = ["blocks", "related"] as const;
export type DependencyType = (typeof DEPENDENCY_TYPES)[number];

/** Mirrors the `task_dependencies` table exactly (raw, undirected-by-
 * perspective — task_id/relatedTaskId are the literal DB columns). */
export interface TaskDependency {
  id: string;
  workspaceId: string;
  taskId: string;
  relatedTaskId: string;
  dependencyType: DependencyType;
  createdBy: string;
  createdAt: string;
}

/** The shape Task Detail's dependency list actually renders: one row
 * per linked task, already resolved to "how does this read from the
 * CURRENT task's point of view" — `direction: "blocking"` means the
 * current task blocks the linked one, `"blocked_by"` means the reverse
 * read of an existing `blocks` row (see migrations README — never a
 * separately stored fact), `"related"` has no direction. Computed by
 * the data layer, not re-derived by every UI consumer. */
export interface TaskDependencySummary {
  dependencyId: string;
  direction: "blocking" | "blocked_by" | "related";
  task: { id: string; taskNumber: number; title: string; status: TaskStatus; projectId: string };
  canRemove: boolean;
}

/** A lightweight subtask row for Task Detail's Subtasks section —
 * deliberately excludes description/full assignee list, mirroring the
 * DocumentSummary/task-list-view pattern of not over-fetching for a
 * compact child list. */
/** A lightweight subtask row for Task Detail's Subtasks section —
 * deliberately excludes description/full assignee list, mirroring the
 * DocumentSummary/task-list-view pattern of not over-fetching for a
 * compact child list. `assignee` shows only the first assignee (a
 * subtask can have several via the same task_assignees table a full
 * task uses — this is a display simplification for the compact row,
 * not a data-model restriction); full assignee management happens by
 * opening the subtask into its own Task Detail. */
export interface SubtaskSummary {
  id: string;
  taskNumber: number;
  title: string;
  status: TaskStatus;
  dueDate: string | null;
  assignee: { id: string; fullName: string | null; avatarUrl: string | null } | null;
}

/** Mirrors the `task_assignees` table. */
export interface TaskAssignee {
  id: string;
  taskId: string;
  userId: string;
  assignedAt: string;
}

/** An assignee joined with enough profile data to render an avatar. */
export interface TaskAssigneeWithProfile extends TaskAssignee {
  fullName: string | null;
  avatarUrl: string | null;
}

/** A task joined with its assignees and tags — the shape List/Board/
 * Detail work with. Tags are joined in the same batched fetch as
 * assignees (never a query per task) so a row can render its chips
 * without a follow-up round trip. */
export interface TaskWithAssignees extends Task {
  assignees: TaskAssigneeWithProfile[];
  tags: Tag[];
}

export type TaskSortField = "updated" | "created" | "dueDate" | "priority";

export interface TaskFilters {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  assigneeId?: string[];
  tagId?: string[];
  query?: string;
}
