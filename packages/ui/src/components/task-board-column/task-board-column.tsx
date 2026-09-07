import * as React from "react";
import { Circle, CircleDot, CircleDashed, CircleCheck, Plus } from "lucide-react";
import type { TaskStatus, TaskWithAssignees } from "@flow/types";
import { cn } from "@flow/utils";
import { TaskCard } from "../task-card/task-card";
import { TASK_STATUS_CONFIG } from "../task-status/task-status";
import { IconButton } from "../button/icon-button";

const STATUS_ICONS = { todo: Circle, in_progress: CircleDot, review: CircleDashed, done: CircleCheck } as const;

export interface TaskBoardColumnProps {
  status: TaskStatus;
  tasks: TaskWithAssignees[];
  getIdentifier?: (task: TaskWithAssignees) => string;
  /** Omitted (undefined) for a task with no subtasks — same shape as
   * TaskRow's `subtaskProgress` prop, computed by the caller. */
  getSubtaskProgress?: (task: TaskWithAssignees) => { completed: number; total: number } | undefined;
  onOpenTask: (task: TaskWithAssignees) => void;
  onCreateTask?: () => void;
  /** Called when a card is dropped onto this column (native HTML5 DnD). */
  onDropTask?: (taskId: string) => void;
}

/** A single Board column. List and Board share the same TaskWithAssignees
 * data — this component only groups/renders it, it doesn't fetch or
 * filter independently (brief section 16). */
export function TaskBoardColumn({
  status,
  tasks,
  getIdentifier,
  getSubtaskProgress,
  onOpenTask,
  onCreateTask,
  onDropTask,
}: TaskBoardColumnProps) {
  const [dragOver, setDragOver] = React.useState(false);
  const Icon = STATUS_ICONS[status];
  const config = TASK_STATUS_CONFIG[status];

  return (
    <div
      className={cn(
        "flex w-72 shrink-0 flex-col gap-3 rounded-lg bg-surface-muted p-3 transition-colors",
        dragOver && "bg-primary-subtle"
      )}
      onDragOver={(e) => {
        if (!onDropTask) return;
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        if (!onDropTask) return;
        e.preventDefault();
        setDragOver(false);
        const taskId = e.dataTransfer.getData("text/task-id");
        if (taskId) onDropTask(taskId);
      }}
    >
      <div className="flex items-center justify-between px-1">
        <span className={cn("flex items-center gap-1.5 text-label", config.className)}>
          <Icon className="size-3.5" aria-hidden="true" />
          {config.label}
          <span className="text-text-muted">{tasks.length}</span>
        </span>
        {onCreateTask && (
          <IconButton label={`Add task to ${config.label}`} onClick={onCreateTask}>
            <Plus className="size-4" />
          </IconButton>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {tasks.map((task) => (
          <div
            key={task.id}
            draggable={Boolean(onDropTask)}
            onDragStart={(e) => e.dataTransfer.setData("text/task-id", task.id)}
          >
            <TaskCard
              task={task}
              identifier={getIdentifier?.(task)}
              subtaskProgress={getSubtaskProgress?.(task)}
              onClick={() => onOpenTask(task)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
