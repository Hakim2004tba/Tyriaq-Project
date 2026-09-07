import * as React from "react";
import type { ProjectColor, ProjectStatus } from "@flow/types";
import { formatRelativeTime, cn } from "@flow/utils";
import { Card } from "../card/card";
import { ProjectStatusBadge } from "../status-badge/status-badge";
import { AvatarGroup } from "../avatar/avatar";
import { PROJECT_COLOR_CLASSES } from "../../lib/project-color";

export interface ProjectCardProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  description?: string | null;
  icon?: string | null;
  color: ProjectColor;
  status: ProjectStatus;
  updatedAt: string;
  members: { id: string; name: string; avatarUrl?: string | null }[];
}

export const ProjectCard = React.forwardRef<HTMLDivElement, ProjectCardProps>(
  ({ name, description, icon, color, status, updatedAt, members, className, ...props }, ref) => {
    const colorClasses = PROJECT_COLOR_CLASSES[color];
    return (
      <Card
        ref={ref}
        className={cn(
          "flex cursor-pointer flex-col gap-3 p-5 transition-shadow hover:shadow-sm",
          className
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-3">
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-md text-body font-semibold",
              colorClasses.bg,
              colorClasses.text
            )}
            aria-hidden="true"
          >
            {icon || name.charAt(0).toUpperCase()}
          </span>
          <ProjectStatusBadge status={status} />
        </div>

        <div className="flex flex-col gap-1">
          <h3 className="text-h4 text-text-primary line-clamp-1">{name}</h3>
          {description && (
            <p className="text-body-sm text-text-secondary line-clamp-2">{description}</p>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between pt-2">
          <AvatarGroup people={members} max={4} size="xs" />
          <span className="text-caption text-text-muted">Updated {formatRelativeTime(updatedAt)}</span>
        </div>
      </Card>
    );
  }
);
ProjectCard.displayName = "ProjectCard";
