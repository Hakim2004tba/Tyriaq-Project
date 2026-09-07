import * as React from "react";
import { UserPlus } from "lucide-react";
import { AvatarGroup } from "../avatar/avatar";
import { cn } from "@flow/utils";

export interface TaskAssigneeGroupProps {
  assignees: { id: string; name: string; avatarUrl?: string | null }[];
  max?: number;
  size?: "xs" | "sm" | "md";
  className?: string;
}

/** Renders assignee avatars via the existing AvatarGroup, with a
 * consistent "Unassigned" affordance when the task has no one on it —
 * the one thing generic enough to be worth a thin task-specific wrapper. */
export function TaskAssigneeGroup({ assignees, max = 3, size = "xs", className }: TaskAssigneeGroupProps) {
  if (assignees.length === 0) {
    return (
      <span className={cn("flex items-center gap-1 text-caption text-text-muted", className)}>
        <UserPlus className="size-3.5" aria-hidden="true" />
        Unassigned
      </span>
    );
  }

  return (
    <div className={className}>
      <AvatarGroup people={assignees} max={max} size={size} />
    </div>
  );
}
