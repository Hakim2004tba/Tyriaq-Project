"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  CalendarDays,
  Check,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Star,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import {
  Avatar,
  AvatarGroup,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  IconButton,
  Progress,
  ProgressRing,
  SectionCard,
  toast,
} from "@flow/ui";
import { cn } from "@flow/utils";
import { SPACE_COLOR } from "@/components/shell";
import { ProjectEditor } from "@/components/projects/project-editor";
import { ProjectWorkspace } from "./project-workspace";
import type { Person, ProjectTask, TaskDetail } from "@/lib/data/task-types";
import {
  addProjectMember,
  deleteProject,
  removeProjectMember,
  setProjectArchived,
  setProjectLead,
} from "@/lib/actions/project";
import {
  PROJECT_STATUS_META,
  formatDate,
  isOverdue,
  progressOf,
  type Member,
  type Project,
  type Space,
} from "@/lib/data/types";

/**
 * A project's own page.
 *
 * Everything here is real: name, description, status, dates, space and
 * roster all persist. What is deliberately absent is the task board —
 * tasks are not in the schema yet, and rendering an empty List/Board/Gantt
 * over a real project would suggest the work simply has not been entered.
 */
export function ProjectDetail({
  project,
  spaces,
  workspaceName,
  workspaceMembers,
  tasks,
  taskDetails,
  workspaceId,
  currentUser,
}: {
  project: Project;
  spaces: Space[];
  workspaceName: string;
  workspaceMembers: Member[];
  tasks: ProjectTask[];
  taskDetails: Record<string, TaskDetail>;
  workspaceId: string;
  currentUser: Person;
}) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const status = PROJECT_STATUS_META[project.status];
  const chip = SPACE_COLOR[project.color];
  const late = isOverdue(project);
  /*
    Completion is the share of this project's top-level tasks that are
    done — a real count now that tasks exist, rather than the coarse
    figure the project's status used to stand in for.
  */
  const topLevel = tasks.filter((t) => !t.parentId);
  const doneCount = topLevel.filter((t) => t.status === "done").length;
  /*
    Zero tasks means zero progress, not the number the project's status
    used to stand in for. A project reading "60% complete" beside a task
    list reading "0/0" is telling the reader two different things, and
    the task count is the one with evidence behind it.
  */
  const progress = progressOf({ taskCount: topLevel.length, doneCount });
  const onProject = new Set(project.members.map((m) => m.id));
  const addable = workspaceMembers.filter((m) => !onProject.has(m.id));

  function run(fn: () => Promise<{ error?: string; message?: string } | void>) {
    startTransition(async () => {
      const r = await fn();
      if (r?.error) toast.error(r.error);
      else if (r?.message) toast.success(r.message);
    });
  }

  return (
    <div className="flex flex-col">
      <div className="border-b border-border">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 pb-5 pt-5 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5">
            <Link href="/dashboard" className="truncate rounded text-body-sm text-text-muted transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:shadow-focus">
              {workspaceName}
            </Link>
            <ChevronRight className="size-3.5 shrink-0 text-text-muted" aria-hidden="true" />
            <Link href={`/spaces/${project.spaceSlug}`} className="truncate rounded text-body-sm text-text-muted transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:shadow-focus">
              {project.spaceName}
            </Link>
            <ChevronRight className="size-3.5 shrink-0 text-text-muted" aria-hidden="true" />
            <span className="truncate text-body-sm font-medium text-text-primary" aria-current="page">
              {project.name}
            </span>
          </nav>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 gap-3">
              <span
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-lg text-h4 font-bold ring-1 ring-inset",
                  chip.chip,
                  chip.text
                )}
                aria-hidden="true"
              >
                {project.name.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="truncate text-h1 text-text-primary">{project.name}</h1>
                  <Badge variant={status.badge}>{status.label}</Badge>
                  {project.archived && <Badge variant="neutral">Archived</Badge>}
                </div>
                <p className="mt-1.5 max-w-2xl text-body-sm leading-[20px] text-text-secondary">
                  {project.description || "No description yet."}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-2 py-1">
                <AvatarGroup
                  people={project.members.map((m) => ({ id: m.id, name: m.name, avatarUrl: m.avatarUrl }))}
                  max={4}
                  size="sm"
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <IconButton label="Add members" size="sm" className="border border-dashed border-border-strong text-text-muted" disabled={addable.length === 0}>
                      <UserPlus className="size-3.5" />
                    </IconButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-60">
                    {addable.length === 0 ? (
                      <p className="px-2.5 py-2 text-caption text-text-muted">
                        Everyone in the workspace is already on this project.
                      </p>
                    ) : (
                      addable.map((m) => (
                        <DropdownMenuItem key={m.id} onSelect={() => run(() => addProjectMember(project.id, m.id))}>
                          <Avatar name={m.name} src={m.avatarUrl} size="xs" />
                          <span className="truncate">{m.name}</span>
                        </DropdownMenuItem>
                      ))
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <Button variant="secondary" size="md" onClick={() => setEditorOpen(true)} disabled={pending}>
                <Pencil className="size-4" />
                <span className="hidden sm:inline">Edit</span>
              </Button>
              <IconButton label="Star project" variant="secondary">
                <Star className="size-4" />
              </IconButton>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <IconButton label="Project options" variant="secondary">
                    <MoreHorizontal className="size-4" />
                  </IconButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onSelect={() => setEditorOpen(true)}>
                    <Pencil className="size-4" />
                    Edit project
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => run(() => setProjectArchived(project.id, !project.archived))}
                    destructive={!project.archived}
                  >
                    {project.archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
                    {project.archived ? "Restore project" : "Archive project"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => run(() => deleteProject(project.id))} destructive>
                    <Trash2 className="size-4" />
                    Delete permanently
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Metric strip */}
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4 pb-1">
            <div className="flex items-center gap-3">
              <ProgressRing
                value={progress}
                size={44}
                strokeWidth={4}
                tone={project.status === "off_track" ? "danger" : project.status === "at_risk" ? "warning" : "brand"}
                label={`${project.name} progress`}
              />
              <div>
                <p className="text-caption text-text-muted">Progress</p>
                <p className="text-body-sm font-medium tabular text-text-primary">
                  {topLevel.length > 0 ? `${doneCount}/${topLevel.length} done` : "No tasks yet"}
                </p>
              </div>
            </div>

            <div className="hidden h-9 w-px bg-border sm:block" aria-hidden="true" />

            <div>
              <p className="text-caption text-text-muted">Lead</p>
              <p className="mt-0.5 text-body-sm font-medium text-text-primary">
                {project.lead?.name ?? "Unassigned"}
              </p>
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-caption text-text-muted">
                <CalendarDays className="size-3.5" aria-hidden="true" />
                Starts
              </p>
              <p className="mt-0.5 text-body-sm font-medium tabular text-text-primary">
                {formatDate(project.startDate)}
              </p>
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-caption text-text-muted">
                <CalendarDays className="size-3.5" aria-hidden="true" />
                Due
              </p>
              <p className={cn("mt-0.5 text-body-sm font-medium tabular", late ? "text-danger" : "text-text-primary")}>
                {formatDate(project.dueDate)}
              </p>
            </div>

            <div className="min-w-[10rem] flex-1">
              <div className="flex items-baseline justify-between">
                <p className="text-caption text-text-muted">Completion</p>
                <p className="text-caption font-medium tabular text-text-secondary">{progress}%</p>
              </div>
              <Progress
                value={progress}
                tone={project.status === "off_track" ? "danger" : project.status === "at_risk" ? "warning" : "brand"}
                label={`${project.name} completion`}
                className="mt-1.5"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-[1440px] gap-4 px-4 py-6 sm:px-6 lg:grid-cols-12 lg:px-8">
        <div className="min-w-0 lg:col-span-8">
          <ProjectWorkspace
            project={project}
            tasks={tasks}
            details={taskDetails}
            workspaceId={workspaceId}
            people={workspaceMembers.map((m) => ({ id: m.id, name: m.name }))}
            currentUser={currentUser}
          />
        </div>

        <div className="flex flex-col gap-4 lg:col-span-4">
          <SectionCard
            title="Members"
            subtitle={`${project.members.length} on this project`}
            action={
              <Link
                href="/settings/people"
                className="rounded text-caption text-primary transition-colors hover:underline
                           focus-visible:outline-none focus-visible:shadow-focus"
              >
                Permissions preview
              </Link>
            }
          >
            {project.members.length === 0 ? (
              <p className="text-body-sm text-text-muted">Nobody is on this project yet.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {project.members.map((m) => (
                  <li key={m.id} className="group flex items-center gap-2.5">
                    <Avatar name={m.name} src={m.avatarUrl} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-body-sm text-text-primary">{m.name}</span>
                    {m.role === "lead" ? (
                      <Badge variant="primary" size="sm">Lead</Badge>
                    ) : (
                      <IconButton
                        label={`Make ${m.name} the lead`}
                        size="sm"
                        className="opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                        onClick={() => run(() => setProjectLead(project.id, m.id))}
                      >
                        <Check className="size-3.5" />
                      </IconButton>
                    )}
                    <IconButton
                      label={`Remove ${m.name}`}
                      size="sm"
                      className="opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                      onClick={() => run(() => removeProjectMember(project.id, m.id))}
                    >
                      <X className="size-3.5" />
                    </IconButton>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Details" subtitle="Where this project lives">
            <dl className="flex flex-col gap-3 text-body-sm">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-text-muted">Space</dt>
                <dd className="min-w-0 truncate">
                  <Link href={`/spaces/${project.spaceSlug}`} className="text-primary hover:underline">
                    {project.spaceName}
                  </Link>
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-text-muted">Status</dt>
                <dd className="text-text-primary">{status.label}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-text-muted">Last updated</dt>
                <dd className="tabular text-text-primary">
                  {formatDate(project.updatedAt.slice(0, 10))}
                </dd>
              </div>
            </dl>
          </SectionCard>
        </div>
      </div>

      <ProjectEditor open={editorOpen} onOpenChange={setEditorOpen} spaces={spaces} project={project} />
    </div>
  );
}
