import * as React from "react";
import { Plus } from "lucide-react";
import type { TaskWithAssignees } from "@flow/types";
import { cn } from "@flow/utils";
import { CalendarTaskChip } from "./calendar-task-chip";
import { IconButton } from "../button/icon-button";

export interface CalendarDayProps {
  dateKey: string;
  dayNumber: number;
  isToday: boolean;
  isOutsideMonth?: boolean;
  tasks: TaskWithAssignees[];
  maxVisible?: number;
  onOpenTask: (task: TaskWithAssignees) => void;
  onCreateTask: (dateKey: string) => void;
  /** Taller cells for Week mode, where there's more vertical room. */
  compact?: boolean;
  /** Day-mode agenda: no grid borders, full-height task list, no
   * per-item cap. */
  fullWidth?: boolean;
}

export function CalendarDay({
  dateKey,
  dayNumber,
  isToday,
  isOutsideMonth,
  tasks,
  maxVisible = 3,
  onOpenTask,
  onCreateTask,
  compact = false,
  fullWidth = false,
}: CalendarDayProps) {
  const visible = compact || fullWidth ? tasks : tasks.slice(0, maxVisible);
  const overflow = compact || fullWidth ? 0 : tasks.length - visible.length;

  return (
    <div
      className={cn(
        "group flex flex-col gap-1 p-1.5",
        fullWidth ? "min-h-[320px] p-4" : "border-b border-r border-border",
        !fullWidth && (compact ? "min-h-[220px]" : "min-h-[100px]"),
        isOutsideMonth && "bg-surface-muted/50"
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            fullWidth ? "flex size-9 items-center justify-center rounded-full text-h4 font-semibold" : "flex size-6 items-center justify-center rounded-full text-caption font-medium",
            isToday ? "bg-primary text-primary-foreground" : isOutsideMonth ? "text-text-muted" : "text-text-secondary"
          )}
        >
          {dayNumber}
        </span>
        <IconButton
          label={`Create task on ${dateKey}`}
          onClick={() => onCreateTask(dateKey)}
          className={cn(fullWidth ? "size-8" : "size-6 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100")}
        >
          <Plus className={fullWidth ? "size-4" : "size-3.5"} />
        </IconButton>
      </div>

      <div className={cn("flex flex-col gap-0.5", fullWidth && "gap-1.5 mt-2")}>
        {visible.length === 0 && fullWidth && <p className="text-body-sm text-text-muted">No tasks on this day.</p>}
        {visible.map((task) => (
          <CalendarTaskChip key={task.id} task={task} onClick={() => onOpenTask(task)} />
        ))}
        {overflow > 0 && (
          <span className="px-1.5 text-caption text-text-muted">+{overflow} more</span>
        )}
      </div>
    </div>
  );
}
