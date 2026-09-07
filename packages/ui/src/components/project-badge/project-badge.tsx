import * as React from "react";
import type { ProjectRef, ProjectColor } from "@flow/types";
import { cn } from "@flow/utils";
import { PROJECT_COLOR_CLASSES } from "../../lib/project-color";

export interface ProjectBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  project: ProjectRef;
}

export function ProjectBadge({ project, className, ...props }: ProjectBadgeProps) {
  // ProjectRef.color is a loose optional string (it's a lightweight
  // reference shape used where only partial project data is available,
  // not the full Project record) — fall back to the same default the
  // database itself uses for a new project's color.
  const colorKey = (project.color && project.color in PROJECT_COLOR_CLASSES ? project.color : "purple") as ProjectColor;
  const colorClasses = PROJECT_COLOR_CLASSES[colorKey];
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-body-sm text-text-secondary", className)}
      {...props}
    >
      <span
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-[4px] text-[10px] font-semibold",
          colorClasses.bg,
          colorClasses.text
        )}
        aria-hidden="true"
      >
        {project.icon ?? project.name.charAt(0).toUpperCase()}
      </span>
      {project.name}
    </span>
  );
}
