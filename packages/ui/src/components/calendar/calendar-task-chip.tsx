import * as React from "react";
import { Circle, CircleDot, CircleDashed, CircleCheck } from "lucide-react";
import type { TaskWithAssignees } from "@flow/types";
import { cn } from "@flow/utils";
import { TASK_STATUS_CONFIG } from "../task-status/task-status";

const STATUS_ICONS = { todo: Circle, in_progress: CircleDot, review: CircleDashed, done: CircleCheck } as const;

export interface CalendarTaskChipProps extends React.HTMLAttributes<HTMLButtonElement> {
  task: TaskWithAssignees;
}

/** A single task entry inside a calendar day cell. Deliberately tiny —
 * the calendar's job is chronological overview, not task detail (that's
 * what clicking through to TaskDetail is for). */
export const CalendarTaskChip = React.forwardRef<HTMLButtonElement, CalendarTaskChipProps>(
  ({ task, className, ...props }, ref) => {
    const Icon = STATUS_ICONS[task.status];
    const config = TASK_STATUS_CONFIG[task.status];
    const priorityAccent =
      task.priority === "urgent" ? "border-l-danger" : task.priority === "high" ? "border-l-warning" : "border-l-transparent";

    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "flex w-full items-center gap-1 truncate rounded-sm border-l-2 bg-surface px-1.5 py-0.5 text-left text-caption",
          "hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          priorityAccent,
          className
        )}
        {...props}
      >
        <Icon className={cn("size-3 shrink-0", config.className)} aria-hidden="true" />
        <span className={cn("truncate", task.status === "done" ? "text-text-muted line-through" : "text-text-primary")}>
          {task.title}
        </span>
      </button>
    );
  }
);
CalendarTaskChip.displayName = "CalendarTaskChip";
