import * as React from "react";
import { CircleDot, CheckCircle2, Archive } from "lucide-react";
import type { ProjectStatus } from "@flow/types";
import { Badge } from "../badge/badge";
import { cn } from "@flow/utils";

const statusConfig: Record<ProjectStatus, { label: string; icon: React.ElementType; className: string }> = {
  active: { label: "Active", icon: CircleDot, className: "bg-success-subtle text-success" },
  completed: { label: "Completed", icon: CheckCircle2, className: "bg-info-subtle text-info" },
  archived: { label: "Archived", icon: Archive, className: "bg-surface-muted text-text-secondary" },
};

export interface ProjectStatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: ProjectStatus;
}

export function ProjectStatusBadge({ status, className, ...props }: ProjectStatusBadgeProps) {
  const { label, icon: Icon, className: colorClass } = statusConfig[status];
  return (
    <Badge className={cn(colorClass, className)} {...props}>
      <Icon className="size-3" aria-hidden="true" />
      {label}
    </Badge>
  );
}
