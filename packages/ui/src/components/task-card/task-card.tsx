import * as React from "react";
import { Calendar, ListChecks } from "lucide-react";
import type { TaskWithAssignees } from "@flow/types";
import { cn } from "@flow/utils";
import { Card } from "../card/card";
import { PriorityBadge } from "../priority-badge/priority-badge";
import { TaskAssigneeGroup } from "../task-assignee-group/task-assignee-group";
import { formatTaskDate, getDueDateUrgency, DUE_DATE_URGENCY_CLASSES } from "../../lib/task-date";

export interface TaskCardProps extends React.HTMLAttributes<HTMLDivElement> {
  task: TaskWithAssignees;
  identifier?: string;
  /** Omitted for a task with no subtasks — same shape as TaskRow's prop,
   * computed by the caller from the already-loaded task list. */
  subtaskProgress?: { completed: number; total: number };
}

/** A task as a Board-column card. Also usable anywhere a compact task
 * summary is needed — deliberately not board-specific in its props. */
export const TaskCard = React.forwardRef<HTMLDivElement, TaskCardProps>(
  ({ task, identifier, subtaskProgress, className, ...props }, ref) => {
    const urgency = task.dueDate ? getDueDateUrgency(task.dueDate) : null;

    return (
      <Card
        ref={ref}
        className={cn(
          "flex cursor-pointer flex-col gap-2.5 p-3.5 transition-shadow hover:shadow-sm",
          className
        )}
        {...props}
      >
        {identifier && <span className="text-caption text-text-muted">{identifier}</span>}

        <p className="text-body-sm font-medium text-text-primary line-clamp-2">{task.title}</p>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {task.priority !== "none" && <PriorityBadge priority={task.priority} />}
            {task.dueDate && (
              <span
                className={cn(
                  "flex items-center gap-1 text-caption",
                  urgency && DUE_DATE_URGENCY_CLASSES[urgency]
                )}
              >
                <Calendar className="size-3" aria-hidden="true" />
                {formatTaskDate(task.dueDate)}
              </span>
            )}
            {subtaskProgress && subtaskProgress.total > 0 && (
              <span className="flex items-center gap-1 text-caption text-text-muted">
                <ListChecks className="size-3" aria-hidden="true" />
                {subtaskProgress.completed}/{subtaskProgress.total}
              </span>
            )}
          </div>
          <TaskAssigneeGroup assignees={task.assignees.map((a) => ({ id: a.id, name: a.fullName || "Unnamed", avatarUrl: a.avatarUrl }))} max={3} />
        </div>
      </Card>
    );
  }
);
TaskCard.displayName = "TaskCard";
