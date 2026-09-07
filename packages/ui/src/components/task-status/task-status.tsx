import * as React from "react";
import { Circle, CircleDot, CircleDashed, CircleCheck } from "lucide-react";
import type { TaskStatus as TaskStatusValue } from "@flow/types";
import { cn } from "@flow/utils";

const statusConfig: Record<TaskStatusValue, { label: string; icon: React.ElementType; className: string }> = {
  todo: { label: "Todo", icon: Circle, className: "text-text-muted" },
  in_progress: { label: "In progress", icon: CircleDot, className: "text-primary" },
  review: { label: "Review", icon: CircleDashed, className: "text-warning" },
  done: { label: "Done", icon: CircleCheck, className: "text-success" },
};

export const TASK_STATUS_CONFIG = statusConfig;

export interface TaskStatusProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: TaskStatusValue;
  showLabel?: boolean;
}

/** Status is always communicated via icon + text, with color as reinforcement only. */
export function TaskStatus({ status, showLabel = true, className, ...props }: TaskStatusProps) {
  const config = statusConfig[status];
  const { label, icon: Icon, className: colorClass } = config;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-body-sm", colorClass, className)} {...props}>
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {showLabel && <span className="text-text-primary">{label}</span>}
      {!showLabel && <span className="sr-only">{label}</span>}
    </span>
  );
}
