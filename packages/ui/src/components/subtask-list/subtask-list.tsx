import * as React from "react";
import { Plus, Check, Calendar } from "lucide-react";
import type { SubtaskSummary } from "@flow/types";
import { cn } from "@flow/utils";
import { formatTaskDate } from "../../lib/task-date";
import { Input } from "../input/input";
import { Avatar } from "../avatar/avatar";

export interface SubtaskListProps {
  subtasks: SubtaskSummary[];
  /** Whether the viewer can add/complete subtasks (task-permission-derived,
   * computed by the caller — same pattern as TimeTracker's `canTrack`). */
  canManage: boolean;
  onOpenSubtask: (subtask: SubtaskSummary) => void;
  /** Binary complete/uncomplete — a ClickUp-style checkbox, not the main
   * task's 3-way status cycle. Full status control (including
   * "in progress") is still available by opening the subtask into its
   * own Task Detail. */
  onToggleComplete: (subtask: SubtaskSummary) => void;
  onAddSubtask: (title: string) => void;
}

/** A compact list of a task's subtasks (one level deep — see
 * supabase/migrations README) with inline quick-add. Assignee/due date
 * are shown for context but are display-only in this compact row —
 * matching the main task list's own TaskRow, which also only lets you
 * *view* the assignee/due date inline and edit them via the full Task
 * Detail. Purely presentational: fetching/mutating subtasks is entirely
 * the caller's responsibility. */
export function SubtaskList({ subtasks, canManage, onOpenSubtask, onToggleComplete, onAddSubtask }: SubtaskListProps) {
  const [newTitle, setNewTitle] = React.useState("");
  const doneCount = subtasks.filter((s) => s.status === "done").length;

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    onAddSubtask(trimmed);
    setNewTitle("");
  }

  return (
    <div className="flex flex-col gap-2">
      {subtasks.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-caption text-text-muted">
            {doneCount} of {subtasks.length} done
          </span>
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-base"
              style={{ width: `${subtasks.length > 0 ? Math.round((doneCount / subtasks.length) * 100) : 0}%` }}
            />
          </div>
        </div>
      )}

      {subtasks.length > 0 && (
        <div className="flex flex-col divide-y divide-border rounded-md border border-border">
          {subtasks.map((subtask) => {
            const isDone = subtask.status === "done";
            return (
              <div key={subtask.id} className="flex items-center gap-2.5 px-2.5 py-2">
                <button
                  type="button"
                  aria-label={isDone ? `Mark "${subtask.title}" as incomplete` : `Mark "${subtask.title}" as complete`}
                  aria-pressed={isDone}
                  disabled={!canManage}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleComplete(subtask);
                  }}
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                    isDone ? "border-success bg-success text-[#052E1B]" : "border-border-strong hover:border-primary",
                    !canManage && "opacity-50"
                  )}
                >
                  {isDone && <Check className="size-2.5" strokeWidth={3} aria-hidden="true" />}
                </button>

                <button
                  type="button"
                  onClick={() => onOpenSubtask(subtask)}
                  className={cn(
                    "min-w-0 flex-1 truncate text-left text-body-sm",
                    isDone ? "text-text-muted line-through" : "text-text-primary"
                  )}
                >
                  {subtask.title}
                </button>

                {subtask.dueDate && (
                  <span className="flex shrink-0 items-center gap-1 text-caption text-text-muted">
                    <Calendar className="size-3" aria-hidden="true" />
                    {formatTaskDate(subtask.dueDate)}
                  </span>
                )}

                {subtask.assignee && (
                  <Avatar
                    name={subtask.assignee.fullName || "Unnamed"}
                    src={subtask.assignee.avatarUrl}
                    size="xs"
                    className="shrink-0"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {canManage && (
        <form onSubmit={handleAdd} className="flex items-center gap-2">
          <Plus className="size-4 shrink-0 text-text-muted" aria-hidden="true" />
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Add subtask…"
            className="h-8 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
        </form>
      )}
    </div>
  );
}
