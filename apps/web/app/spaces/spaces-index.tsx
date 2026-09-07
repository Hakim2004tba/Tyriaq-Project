"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Archive, ArchiveRestore, FolderKanban, MoreHorizontal, Pencil, Plus } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  IconButton,
  toast,
} from "@flow/ui";
import { cn } from "@flow/utils";
import { SpaceBadge } from "@/components/spaces/space-badge";
import { SpaceEditor } from "@/components/spaces/space-editor";
import { useSpaces } from "@/components/spaces/space-store";
import { setSpaceArchived } from "@/lib/actions/space";
import type { Space } from "@/lib/data/types";

function SpaceCard({
  space,
  projectCount,
  onEdit,
  onArchive,
  busy,
}: {
  space: Space;
  projectCount: number;
  onEdit: () => void;
  onArchive: () => void;
  busy: boolean;
}) {
  return (
    <Card
      interactive={!space.archived}
      className={cn("group relative flex min-w-0 flex-col p-4", (space.archived || busy) && "opacity-70")}
    >
      <div className="flex items-start gap-3">
        <SpaceBadge icon={space.icon} color={space.color} size="md" />
        <div className="min-w-0 flex-1">
          <Link
            href={`/spaces/${space.slug}`}
            className="block truncate text-h4 text-text-primary before:absolute before:inset-0
                       before:rounded-lg before:content-[''] focus-visible:outline-none"
          >
            {space.name}
          </Link>
          <p className="truncate text-caption text-text-muted">
            {projectCount} {projectCount === 1 ? "project" : "projects"}
          </p>
        </div>

        <div className="relative flex shrink-0 items-center gap-1">
          {space.archived && <Badge variant="neutral" size="sm">Archived</Badge>}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <IconButton
                label={`Options for ${space.name}`}
                size="sm"
                className="opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
              >
                <MoreHorizontal className="size-4" />
              </IconButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onSelect={onEdit}>
                <Pencil className="size-4" />
                Rename &amp; appearance
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/spaces/${space.slug}`}>
                  <FolderKanban className="size-4" />
                  Open space
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onArchive} destructive={!space.archived}>
                {space.archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
                {space.archived ? "Restore space" : "Archive space"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <p className="mt-3 line-clamp-2 text-body-sm leading-[19px] text-text-secondary">
        {space.description || "No description yet."}
      </p>
    </Card>
  );
}

/**
 * The Spaces index.
 *
 * Archived spaces stay on the page under their own heading rather than
 * hiding behind a filter: archiving is reversible, and the usual reason to
 * come back here after archiving something is to un-archive it.
 */
export function SpacesIndex() {
  const store = useSpaces();
  const params = useSearchParams();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Space | undefined>(undefined);
  const [pending, startTransition] = useTransition();

  // The rail's "+" links here with ?new=1 so it can open this dialog from
  // a page that is not mounted yet.
  useEffect(() => {
    if (params.get("new") === "1") {
      setEditing(undefined);
      setEditorOpen(true);
    }
  }, [params]);

  function archive(space: Space) {
    startTransition(async () => {
      const result = await setSpaceArchived(space.id, !space.archived);
      if (result.error) toast.error(result.error);
      else if (result.message) toast.success(result.message);
    });
  }

  const openCreate = () => {
    setEditing(undefined);
    setEditorOpen(true);
  };

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-h1 text-text-primary">Spaces</h1>
          <p className="mt-1.5 text-body text-text-secondary">
            {store.active.length} active {store.active.length === 1 ? "space" : "spaces"} in{" "}
            {store.currentWorkspace?.name ?? "this workspace"} · Spaces hold projects.
          </p>
        </div>
        <Button variant="primary" size="md" className="shrink-0" onClick={openCreate}>
          <Plus className="size-4" />
          New space
        </Button>
      </header>

      {store.active.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="size-5" />}
          title="No spaces yet"
          description="Create a space to group related projects."
          action={
            <Button variant="secondary" size="sm" onClick={openCreate}>
              Create a space
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {store.active.map((s) => (
            <SpaceCard
              key={s.id}
              space={s}
              projectCount={store.projectsBySpace.get(s.id)?.length ?? 0}
              busy={pending}
              onEdit={() => {
                setEditing(s);
                setEditorOpen(true);
              }}
              onArchive={() => archive(s)}
            />
          ))}
        </div>
      )}

      {store.archived.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-h4 text-text-primary">Archived</h2>
            <span className="text-caption tabular text-text-muted">{store.archived.length}</span>
            <span className="tq-rule flex-1" aria-hidden="true" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {store.archived.map((s) => (
              <SpaceCard
                key={s.id}
                space={s}
                projectCount={store.projectsBySpace.get(s.id)?.length ?? 0}
                busy={pending}
                onEdit={() => {
                  setEditing(s);
                  setEditorOpen(true);
                }}
                onArchive={() => archive(s)}
              />
            ))}
          </div>
        </section>
      )}

      <SpaceEditor open={editorOpen} onOpenChange={setEditorOpen} space={editing} />
    </div>
  );
}
