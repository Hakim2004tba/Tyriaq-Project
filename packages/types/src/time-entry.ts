/** Time-tracking domain types (Phase 10). Mirrors task_time_entries —
 * see supabase/migrations/README.md for the duration/atomicity/
 * authorization decisions. */
import type { CommentAuthor } from "./comment";

export interface TaskTimeEntry {
  id: string;
  workspaceId: string;
  taskId: string;
  userId: string;
  startedAt: string;
  /** null = currently running. */
  endedAt: string | null;
  /** Server-computed (GENERATED column) — null while running, never
   * client-supplied. */
  durationSeconds: number | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskTimeEntryWithUser extends TaskTimeEntry {
  user: CommentAuthor;
}

/** Precomputed for Task Detail: the running entry (if the viewer has
 * one on this task) plus the sum of completed entries — avoids the UI
 * re-deriving these from the raw list itself. */
export interface TaskTimeSummary {
  totalSeconds: number;
  runningEntry: TaskTimeEntryWithUser | null;
}
