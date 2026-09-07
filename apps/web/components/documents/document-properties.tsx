"use client";

import { useTransition } from "react";
import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  CheckCircle2,
  Circle,
  ExternalLink,
  FolderIcon,
  Trash2,
} from "lucide-react";
import {
  Badge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  SectionCard,
  toast,
} from "@flow/ui";
import { formatExact, formatRelative } from "@/lib/data/task-types";
import {
  deleteDocument,
  moveDocument,
  setDocumentArchived,
} from "@/lib/actions/document";
import type { DocumentFolder, DocumentRecord } from "@/lib/data/document-types";
import type { Project } from "@/lib/data/types";

/**
 * Where a document sits and what it points at.
 *
 * The linked-task list is read from the tasks table through the link
 * index, so it is the same live data the chips in the body show — not a
 * second copy that could disagree with them.
 */
export function DocumentProperties({
  document,
  folders,
  projects,
  canDelete,
}: {
  document: DocumentRecord;
  folders: DocumentFolder[];
  projects: Project[];
  canDelete: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<{ error?: string; message?: string } | void>) {
    startTransition(async () => {
      const result = await fn();
      if (result?.error) toast.error(result.error);
      else if (result?.message) toast.success(result.message);
    });
  }

  const folder = folders.find((f) => f.id === document.folderId);

  return (
    <div className="flex w-full shrink-0 flex-col gap-4 lg:w-72">
      <SectionCard title="Properties" subtitle="Where this document lives">
        <dl className="flex flex-col gap-3 text-body-sm">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="shrink-0 text-text-muted">Folder</dt>
            <dd className="min-w-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    disabled={pending}
                    className="flex max-w-full items-center gap-1.5 rounded px-1 py-0.5 text-text-primary
                               transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:shadow-focus"
                  >
                    <FolderIcon className="size-3.5 shrink-0 text-text-muted" aria-hidden="true" />
                    <span className="truncate">{folder?.name ?? "Unfiled"}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onSelect={() => run(() => moveDocument(document.id, { folderId: null }))}>
                    Unfiled
                  </DropdownMenuItem>
                  {folders.map((f) => (
                    <DropdownMenuItem
                      key={f.id}
                      onSelect={() => run(() => moveDocument(document.id, { folderId: f.id }))}
                    >
                      <FolderIcon className="size-4" />
                      <span className="truncate">{f.name}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </dd>
          </div>

          <div className="flex items-baseline justify-between gap-3">
            <dt className="shrink-0 text-text-muted">Project</dt>
            <dd className="min-w-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    disabled={pending}
                    className="max-w-full truncate rounded px-1 py-0.5 text-text-primary transition-colors
                               hover:bg-white/5 focus-visible:outline-none focus-visible:shadow-focus"
                  >
                    {document.projectName ?? "Workspace-wide"}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onSelect={() => run(() => moveDocument(document.id, { projectId: null }))}>
                    Workspace-wide
                  </DropdownMenuItem>
                  {projects.map((p) => (
                    <DropdownMenuItem
                      key={p.id}
                      onSelect={() => run(() => moveDocument(document.id, { projectId: p.id }))}
                    >
                      <span className="truncate">{p.name}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </dd>
          </div>

          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-text-muted">Created by</dt>
            <dd className="min-w-0 truncate text-text-primary">{document.createdByName}</dd>
          </div>

          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-text-muted">Last edited</dt>
            <dd className="tabular text-text-primary" title={formatExact(document.updatedAt)}>
              {formatRelative(document.updatedAt)}
            </dd>
          </div>

          {document.archived && (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-text-muted">Status</dt>
              <dd>
                <Badge variant="neutral" size="sm">Archived</Badge>
              </dd>
            </div>
          )}
        </dl>

        <div className="mt-4 flex flex-col gap-1 border-t border-border pt-3">
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => setDocumentArchived(document.id, !document.archived))}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-body-sm text-text-secondary
                       transition-colors hover:bg-white/5 hover:text-text-primary
                       focus-visible:outline-none focus-visible:shadow-focus"
          >
            {document.archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
            {document.archived ? "Restore document" : "Archive document"}
          </button>

          {canDelete && (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => deleteDocument(document.id))}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-body-sm text-danger
                         transition-colors hover:bg-danger-subtle
                         focus-visible:outline-none focus-visible:shadow-focus"
            >
              <Trash2 className="size-4" />
              Delete permanently
            </button>
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="Linked tasks"
        subtitle={
          document.linkedTasks.length === 0
            ? "Type # in the body to link one"
            : `${document.linkedTasks.length} referenced`
        }
      >
        {document.linkedTasks.length === 0 ? (
          <p className="text-body-sm text-text-muted">
            A linked task is a pointer, not a copy — it shows its real title and status, and follows
            through to the project it lives in.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {document.linkedTasks.map((task) => {
              const done = task.status === "done";
              const Icon = done ? CheckCircle2 : Circle;
              const row = (
                <>
                  <Icon
                    className={done ? "size-3.5 shrink-0 text-success" : "size-3.5 shrink-0 text-text-muted"}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate">{task.title}</span>
                  {task.projectSlug && <ExternalLink className="size-3.5 shrink-0 text-text-muted" />}
                </>
              );
              return (
                <li key={task.id}>
                  {task.projectSlug ? (
                    <Link
                      href={`/projects/${task.projectSlug}?task=${task.id}`}
                      className="flex items-center gap-2 rounded-md px-1 py-1 text-body-sm text-text-secondary
                                 transition-colors hover:bg-white/5 hover:text-text-primary
                                 focus-visible:outline-none focus-visible:shadow-focus"
                    >
                      {row}
                    </Link>
                  ) : (
                    <span className="flex items-center gap-2 px-1 py-1 text-body-sm text-text-muted">{row}</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
