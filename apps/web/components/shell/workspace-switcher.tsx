"use client";

import { useActionState, useState } from "react";
import { Check, ChevronDown, Pencil, Plus } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  toast,
} from "@flow/ui";
import { useSpaces } from "@/components/spaces/space-store";
import { createWorkspace, renameWorkspace } from "@/lib/actions/workspace";
import type { ActionResult } from "@/lib/actions/workspace";

/**
 * The workspace switcher.
 *
 * Renaming is admin-only in the database, so the menu item is hidden for
 * plain members rather than shown and then failing — an action you are
 * offered and refused is worse than one you were never offered.
 */
export function WorkspaceSwitcher() {
  const store = useSpaces();
  const current = store.currentWorkspace;
  const [renameOpen, setRenameOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const canRename = current?.role === "owner" || current?.role === "admin";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="hidden h-9 items-center gap-2 rounded-md border border-border px-2.5 text-left
                       transition-colors duration-fast hover:border-border-strong hover:bg-surface
                       focus-visible:outline-none focus-visible:shadow-focus lg:flex"
          >
            <span className="flex size-5 items-center justify-center rounded-[6px] bg-brand text-[10px] font-bold text-white">
              {(current?.name ?? "T").charAt(0).toUpperCase()}
            </span>
            <span className="max-w-[9rem] truncate text-body-sm font-medium text-text-primary">
              {current?.name ?? "No workspace"}
            </span>
            <ChevronDown className="size-3.5 shrink-0 text-text-muted" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-64">
          <p className="px-2.5 py-1.5 text-overline uppercase text-text-muted">Workspaces</p>
          {store.workspaces.map((w) => (
            <DropdownMenuItem key={w.id} disabled={w.id === current?.id}>
              <span className="flex size-4 items-center justify-center">
                {w.id === current?.id && <Check className="size-4" />}
              </span>
              <span className="min-w-0 flex-1 truncate">{w.name}</span>
              <span className="shrink-0 text-caption capitalize text-text-muted">{w.role}</span>
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />
          {canRename && (
            <DropdownMenuItem onSelect={() => setRenameOpen(true)}>
              <Pencil className="size-4" />
              Rename workspace
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            New workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <RenameDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        currentName={current?.name ?? ""}
      />
      <CreateDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}

function RenameDialog({
  open,
  onOpenChange,
  currentName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currentName: string;
}) {
  const [state, action] = useActionState<ActionResult, FormData>(async (prev, fd) => {
    const result = await renameWorkspace(prev, fd);
    if (result.message) {
      toast.success(result.message);
      onOpenChange(false);
    }
    return result;
  }, {});

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename workspace</DialogTitle>
          <DialogDescription>
            Only the name changes — the URL stays the same so existing links keep working.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-4">
          {state.error && (
            <p role="alert" className="rounded-md border border-danger/30 bg-danger-subtle px-3 py-2 text-body-sm text-danger">
              {state.error}
            </p>
          )}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ws-name" className="text-label text-text-secondary">
              Name
            </label>
            <Input id="ws-name" name="name" defaultValue={currentName} autoFocus required />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CreateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [state, action] = useActionState<ActionResult, FormData>(createWorkspace, {});

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a workspace</DialogTitle>
          <DialogDescription>
            A separate workspace with its own spaces, projects and members.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-4">
          {state.error && (
            <p role="alert" className="rounded-md border border-danger/30 bg-danger-subtle px-3 py-2 text-body-sm text-danger">
              {state.error}
            </p>
          )}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="new-ws-name" className="text-label text-text-secondary">
              Name
            </label>
            <Input id="new-ws-name" name="name" placeholder="Acme, Design Team…" autoFocus required />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Create workspace</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
