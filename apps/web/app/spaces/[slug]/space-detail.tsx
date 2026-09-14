"use client";

import { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  ChevronRight,
  FolderKanban,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import {
  AvatarGroup,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  IconButton,
  Progress,
  SectionCard,
  toast,
} from "@flow/ui";
import { cn } from "@flow/utils";
import { SpaceBadge } from "@/components/spaces/space-badge";
import { SpaceEditor } from "@/components/spaces/space-editor";
import { ProjectEditor } from "@/components/projects/project-editor";
import {
  SpaceMembersDialog,
  type SpaceMemberEntry,
} from "@/components/spaces/space-members-dialog";
import type { JoinRequest } from "@/lib/actions/space-link";
import { deleteSpace, setSpaceArchived } from "@/lib/actions/space";
import {
  PROJECT_STATUS_META,
  formatDate,
  isOverdue,
  progressOf,
  type Member,
  type Project,
  type Space,
} from "@/lib/data/types";

function ProjectRow({ project }: { project: Project }) {
  const status = PROJECT_STATUS_META[project.status];
  const late = isOverdue(project);
  return (
    <li>
      <Link
        href={`/projects/${project.slug}`}
        className="flex items-center gap-3 py-2.5 pl-4 pr-4 transition-colors duration-fast
                   hover:bg-white/[0.025] focus-visible:outline-none focus-visible:bg-white/[0.04]"
      >
        <span className={cn("size-2 shrink-0 rounded-full", status.dot)} aria-hidden="true" title={status.label} />
        <span className="min-w-0 flex-1 truncate text-body-sm text-text-primary">{project.name}</span>

        <Badge variant={status.badge} size="sm" className="hidden shrink-0 lg:inline-flex">
          {status.label}
        </Badge>
        <span className="hidden w-28 shrink-0 items-center gap-2 md:flex">
          <Progress value={progressOf(project)} label={`${project.name} progress`} className="flex-1" />
          <span className="shrink-0 text-caption tabular text-text-muted">{progressOf(project)}%</span>
        </span>
        <span
          className={cn(
            "hidden w-24 shrink-0 text-right text-caption tabular sm:block",
            late ? "text-danger" : "text-text-muted"
          )}
        >
          {formatDate(project.dueDate)}
        </span>
      </Link>
    </li>
  );
}

/**
 * A space's own page.
 *
 * The hierarchy here is Workspace → Space → Project, so projects render as
 * one flat list under the space rather than nested further.
 */
export function SpaceDetail({
  space,
  projects,
  workspaceName,
  spaces,
  canDelete,
  workspaceMembers,
  canManageMembers,
  joinRequests,
  spaceMembers,
}: {
  space: Space;
  projects: Project[];
  workspaceName: string;
  spaces: Space[];
  canDelete: boolean;
  workspaceMembers: Member[];
  canManageMembers: boolean;
  joinRequests: JoinRequest[];
  spaceMembers: SpaceMemberEntry[];
}) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const params = useSearchParams();
  const [membersOpen, setMembersOpen] = useState(false);

  /*
    `?members=1` opens the dialog on arrival — that is the link a join
    notification carries, and the request it is about is inside.
  */
  useEffect(() => {
    if (params.get("members")) setMembersOpen(true);
  }, [params]);
  // Seeded from the database and kept in step optimistically while the
  // dialog is open; the server is the source of truth on the next load.
  const [members, setMembers] = useState<SpaceMemberEntry[]>(spaceMembers);
  const [pending, startTransition] = useTransition();

  const active = projects.filter((p) => !p.archived);
  const archived = projects.filter((p) => p.archived);
  const avgProgress =
    active.length === 0
      ? 0
      : Math.round(active.reduce((n, p) => n + progressOf(p), 0) / active.length);

  function toggleArchive() {
    startTransition(async () => {
      const r = await setSpaceArchived(space.id, !space.archived);
      if (r.error) toast.error(r.error);
      else if (r.message) toast.success(r.message);
    });
  }

  function removeSpace() {
    startTransition(async () => {
      const r = await deleteSpace(space.id);
      if (r?.error) toast.error(r.error);
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
            <Link href="/spaces" className="truncate rounded text-body-sm text-text-muted transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:shadow-focus">
              Spaces
            </Link>
            <ChevronRight className="size-3.5 shrink-0 text-text-muted" aria-hidden="true" />
            <span className="truncate text-body-sm font-medium text-text-primary" aria-current="page">
              {space.name}
            </span>
          </nav>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 gap-3">
              <SpaceBadge icon={space.icon} color={space.color} size="lg" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="truncate text-h1 text-text-primary">{space.name}</h1>
                  {space.archived && <Badge variant="neutral">Archived</Badge>}
                </div>
                <p className="mt-1.5 max-w-2xl text-body-sm leading-[20px] text-text-secondary">
                  {space.description || "No description yet."}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {/* Members sit beside Edit because they are a property of
                  the space, not of the project list below it. */}
              <Button
                variant="secondary"
                size="md"
                onClick={() => setMembersOpen(true)}
                className={cn(joinRequests.length > 0 && "border-warning/50")}
              >
                {members.length > 0 ? (
                  <AvatarGroup
                    people={members.map((entry) => ({
                      id: entry.member.id,
                      name: entry.member.name,
                      avatarUrl: entry.member.avatarUrl,
                    }))}
                    max={3}
                    size="xs"
                  />
                ) : (
                  <Users className="size-4" />
                )}
                <span className="hidden sm:inline">
                  {members.length > 0 ? `${members.length} member${members.length === 1 ? "" : "s"}` : "Members"}
                </span>
                {/*
                  Somebody is waiting. This is the only place in the
                  space that says so, and a request nobody sees is the
                  failure the whole join flow exists to avoid — so it is
                  on the button rather than inside the dialog it opens.
                */}
                {joinRequests.length > 0 && (
                  <Badge variant="warning" size="sm">
                    {joinRequests.length} waiting
                  </Badge>
                )}
              </Button>

              <Button variant="secondary" size="md" onClick={() => setEditorOpen(true)}>
                <Pencil className="size-4" />
                <span className="hidden sm:inline">Edit</span>
              </Button>
              <Button variant="primary" size="md" onClick={() => setProjectOpen(true)} disabled={pending}>
                <Plus className="size-4" />
                <span className="hidden sm:inline">New project</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <IconButton label="Space options" variant="secondary">
                    <MoreHorizontal className="size-4" />
                  </IconButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onSelect={() => setEditorOpen(true)}>
                    <Pencil className="size-4" />
                    Rename &amp; appearance
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={toggleArchive} destructive={!space.archived}>
                    {space.archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
                    {space.archived ? "Restore space" : "Archive space"}
                  </DropdownMenuItem>
                  {/* Deletion is admin-only in the database and cascades to
                      every project inside, so it is hidden from everyone
                      else rather than offered and refused. */}
                  {canDelete && (
                    <DropdownMenuItem onSelect={removeSpace} destructive>
                      <Trash2 className="size-4" />
                      Delete permanently
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <div>
              <p className="text-caption text-text-muted">Projects</p>
              <p className="mt-0.5 text-body-sm font-medium tabular text-text-primary">{active.length}</p>
            </div>
            <div>
              <p className="text-caption text-text-muted">Archived</p>
              <p className="mt-0.5 text-body-sm font-medium tabular text-text-muted">{archived.length}</p>
            </div>
            <div className="min-w-[10rem] flex-1">
              <div className="flex items-baseline justify-between">
                <p className="text-caption text-text-muted">Average progress</p>
                <p className="text-caption font-medium tabular text-text-secondary">{avgProgress}%</p>
              </div>
              <Progress value={avgProgress} label={`${space.name} progress`} className="mt-1.5" />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
        <SectionCard
          title="Projects"
          subtitle={`${active.length} active${archived.length ? ` · ${archived.length} archived` : ""}`}
          flush
          action={
            <Button variant="ghost" size="sm" onClick={() => setProjectOpen(true)}>
              <Plus className="size-3.5" />
              New project
            </Button>
          }
        >
          {active.length === 0 && archived.length === 0 ? (
            <div className="px-5 pb-6">
              <EmptyState
                icon={<FolderKanban className="size-5" />}
                title="No projects in this space"
                description="Create one to start organising work here."
                action={
                  <Button variant="secondary" size="sm" onClick={() => setProjectOpen(true)}>
                    Create a project
                  </Button>
                }
              />
            </div>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {active.map((p) => (
                <ProjectRow key={p.id} project={p} />
              ))}
              {archived.length > 0 && (
                <li>
                  <p className="border-b border-border bg-surface-muted/40 px-4 py-2 text-overline uppercase text-text-muted">
                    Archived
                  </p>
                  <ul className="divide-y divide-border opacity-60">
                    {archived.map((p) => (
                      <ProjectRow key={p.id} project={p} />
                    ))}
                  </ul>
                </li>
              )}
            </ul>
          )}
        </SectionCard>
      </div>

      <SpaceMembersDialog
        open={membersOpen}
        onOpenChange={setMembersOpen}
        spaceId={space.id}
        spaceName={space.name}
        workspaceMembers={workspaceMembers}
        entries={members}
        onChange={setMembers}
        canManage={canManageMembers}
        joinRequests={joinRequests}
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
      />

      <SpaceEditor open={editorOpen} onOpenChange={setEditorOpen} space={space} />
      <ProjectEditor
        open={projectOpen}
        onOpenChange={setProjectOpen}
        spaces={spaces}
        defaultSpaceId={space.id}
      />
    </div>
  );
}
