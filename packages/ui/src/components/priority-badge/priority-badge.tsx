import * as React from "react";
import { ChevronsUp, ChevronUp, Minus, AlertTriangle, Equal } from "lucide-react";
import type { TaskPriority } from "@flow/types";
import { Badge } from "../badge/badge";
import { cn } from "@flow/utils";

// Visual weight scales with severity — "none"/"low" stay quiet (muted,
// no fill), "urgent" is the only one that reaches for the danger color,
// so the interface stays calm overall (brief section 26).
const priorityConfig: Record<TaskPriority, { label: string; icon: React.ElementType; className: string }> = {
  none: { label: "No priority", icon: Equal, className: "bg-surface-muted text-text-muted" },
  low: { label: "Low", icon: Minus, className: "bg-surface-muted text-text-secondary" },
  medium: { label: "Medium", icon: ChevronUp, className: "bg-info-subtle text-info" },
  high: { label: "High", icon: ChevronsUp, className: "bg-warning-subtle text-warning" },
  urgent: { label: "Urgent", icon: AlertTriangle, className: "bg-danger-subtle text-danger" },
};

export const PRIORITY_CONFIG = priorityConfig;

export interface PriorityBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  priority: TaskPriority;
}

export function PriorityBadge({ priority, className, ...props }: PriorityBadgeProps) {
  const config = priorityConfig[priority];
  const { label, icon: Icon, className: colorClass } = config;
  return (
    <Badge className={cn(colorClass, className)} {...props}>
      <Icon className="size-3" aria-hidden="true" />
      {label}
    </Badge>
  );
}
