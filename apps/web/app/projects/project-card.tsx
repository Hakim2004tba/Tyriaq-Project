"use client";

import Link from "next/link";
import { Archive, ArchiveRestore, CalendarDays, MoreHorizontal, Pencil } from "lucide-react";
import {
  AvatarGroup,
  Badge,
  Card,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  IconButton,
  Progress,
  DropdownMenuTrigger,
} from "@flow/ui";
import { cn } from "@flow/utils";
import { SPACE_COLOR } from "@/components/shell";
import {
  PROJECT_STATUS_META,
  formatDate,
  isOverdue,
  progressOf,
  type Project,
} from "@/lib/data/types";

/**
 * A project card.
 *
 * Ordered by the question it answers: what is this, how far along, when,
 * who. Uses a stretched link so the whole card is a target while the
 * overflow menu stays a separately focusable sibling.
 */
export function ProjectCard({
  project,
  onEdit,
  onArchive,
}: {
  project: Project;
  onEdit: () => void;
  onArchive: () => void;
}) {
  const status = PROJECT_STATUS_META[project.status];
  const chip = SPACE_COLOR[project.color];
  const late = isOverdue(project);
  const progress = progressOf(project);

  return (
    <Card
      interactive={!project.archived}
      className={cn("group relative flex min-w-0 flex-col p-4", project.archived && "opacity-70")}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-md text-body-sm font-bold ring-1 ring-inset",
            chip.chip,
            chip.text
          )}
          aria-hidden="true"
        >
          {project.name.slice(0, 2).toUpperCase()}
        </span>

        <div className="min-w-0 flex-1">
          <Link
            href={`/projects/${project.slug}`}
            className="block truncate text-h4 text-text-primary before:absolute before:inset-0
                       before:rounded-lg before:content-[''] focus-visible:outline-none"
          >
            {project.name}
          </Link>
          <p className="truncate text-caption text-text-muted">{project.spaceName}</p>
        </div>

        <div className="relative flex shrink-0 items-center gap-1">
          {project.archived && <Badge variant="neutral" size="sm">Archived</Badge>}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <IconButton
                label={`Options for ${project.name}`}
                size="sm"
                className="opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
              >
                <MoreHorizontal className="size-4" />
              </IconButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onSelect={onEdit}>
                <Pencil className="size-4" />
                Edit project
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onArchive} destructive={!project.archived}>
                {project.archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
                {project.archived ? "Restore project" : "Archive project"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <p className="mt-3 line-clamp-2 text-body-sm leading-[19px] text-text-secondary">
        {project.description || "No description yet."}
      </p>

      <div className="mt-4 flex items-center gap-3">
        <Progress
          value={progress}
          tone={project.status === "off_track" ? "danger" : project.status === "at_risk" ? "warning" : "brand"}
          label={`${project.name} progress`}
          className="flex-1"
        />
        <span className="shrink-0 text-caption font-medium tabular text-text-secondary">{progress}%</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-caption text-text-muted">
        <span className={cn("inline-flex items-center gap-1.5 tabular", late && "text-danger")}>
          <CalendarDays className="size-3.5" aria-hidden="true" />
          {formatDate(project.dueDate)}
        </span>
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 pt-4">
        <AvatarGroup
          people={project.members.map((m) => ({ id: m.id, name: m.name, avatarUrl: m.avatarUrl }))}
          max={4}
          size="xs"
        />
        <Badge variant={status.badge} size="sm">
          {status.label}
        </Badge>
      </div>

      <p className="mt-3 flex items-center gap-1.5 border-t border-border pt-3 text-caption text-text-muted">
        <span className="min-w-0 truncate">
          {project.lead ? `Lead · ${project.lead.name}` : "No lead assigned"}
        </span>
      </p>
    </Card>
  );
}
