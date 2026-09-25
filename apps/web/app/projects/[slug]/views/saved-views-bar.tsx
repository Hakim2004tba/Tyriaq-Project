"use client";

import { useState, useTransition } from "react";
import { Bookmark, BookmarkPlus, Globe, Lock, X } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  toast,
} from "@flow/ui";
import { cn } from "@flow/utils";
import { deleteView, saveView } from "@/lib/actions/board";
import type { SavedView } from "@/lib/data/board";

/**
 * The views saved over this board.
 *
 * "Ahmed's overdue work, grouped by priority" is a question somebody
 * asks every Monday. Without this it has to be rebuilt by hand every
 * Monday, which is why most people stop filtering and scroll instead.
 *
 * A view saves the CURRENT state of the toolbar. It does not track it
 * afterwards — clicking a view applies it, and changing a filter
 * afterwards does not silently rewrite what was saved, because a saved
 * question that quietly changes meaning is worse than no saved question.
 */
export function SavedViewsBar({
  views,
  projectId,
  layout,
  currentConfig,
  activeId,
  onApply,
  viewerId,
}: {
  views: SavedView[];
  projectId: string;
  layout: "list" | "board" | "calendar" | "gantt";
  /** Whatever the toolbar is set to right now. */
  currentConfig: Record<string, unknown>;
  activeId: string | null;
  onApply: (view: SavedView | null) => void;
  viewerId: string;
}) {
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [shared, setShared] = useState(false);
  const [rows, setRows] = useState(views);
  const [pending, startTransition] = useTransition();

  function save() {
    const label = name.trim();
    if (!label) return;
    startTransition(async () => {
      const result = await saveView({
        name: label,
        projectId,
        layout,
        config: currentConfig,
        isShared: shared,
      });
      if (result.error || !result.id) {
        toast.error(result.error ?? "Could not save that view.");
        return;
      }
      setRows((current) => [
        ...current,
        { id: result.id!, name: label, layout, config: currentConfig, isShared: shared, createdBy: viewerId },
      ]);
      setSaving(false);
      setName("");
      setShared(false);
      toast.success(result.message ?? "Saved.");
    });
  }

  function remove(view: SavedView) {
    const previous = rows;
    setRows((current) => current.filter((row) => row.id !== view.id));
    if (activeId === view.id) onApply(null);
    startTransition(async () => {
      const result = await deleteView(view.id);
      if (result.error) {
        setRows(previous);
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5">
        {/*
          "All tasks" is a view too — without it, applying one would be a
          door with no way back out.
        */}
        <button
          type="button"
          onClick={() => onApply(null)}
          className={cn(
            "rounded-md px-2.5 py-1 text-caption transition-colors",
            "focus-visible:outline-none focus-visible:shadow-focus",
            activeId === null
              ? "bg-primary-muted text-primary"
              : "text-text-muted hover:bg-white/[0.04] hover:text-text-secondary"
          )}
        >
          All tasks
        </button>

        {rows.map((view) => (
          <span key={view.id} className="group/view inline-flex items-center">
            <button
              type="button"
              onClick={() => onApply(view)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-caption transition-colors",
                "focus-visible:outline-none focus-visible:shadow-focus",
                activeId === view.id
                  ? "bg-primary-muted text-primary"
                  : "text-text-muted hover:bg-white/[0.04] hover:text-text-secondary"
              )}
            >
              {view.isShared ? (
                <Globe className="size-3" aria-hidden="true" />
              ) : (
                <Lock className="size-3" aria-hidden="true" />
              )}
              {view.name}
            </button>

            {/* Only the author may remove it, which the policy enforces too. */}
            {view.createdBy === viewerId && (
              <button
                type="button"
                onClick={() => remove(view)}
                aria-label={`Remove the ${view.name} view`}
                className="ml-0.5 hidden rounded p-0.5 text-text-muted transition-colors
                           hover:text-danger focus-visible:outline-none focus-visible:shadow-focus
                           group-hover/view:block"
              >
                <X className="size-3" />
              </button>
            )}
          </span>
        ))}

        <Button variant="ghost" size="sm" onClick={() => setSaving(true)}>
          <BookmarkPlus className="size-3.5" />
          Save this view
        </Button>
      </div>

      <Dialog open={saving} onOpenChange={(next) => !next && setSaving(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Save this view</DialogTitle>
          </DialogHeader>

          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && save()}
            placeholder="Overdue, by priority"
            aria-label="View name"
            autoFocus
          />

          <label className="flex items-start gap-2.5 text-body-sm text-text-secondary">
            <input
              type="checkbox"
              checked={shared}
              onChange={(event) => setShared(event.target.checked)}
              className="mt-0.5 size-4 accent-[var(--color-primary,#7c5cff)]"
            />
            <span>
              Share with the team
              <span className="block text-caption text-text-muted">
                They see the same question, answered with what they are allowed to see.
              </span>
            </span>
          </label>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setSaving(false)}>
              Cancel
            </Button>
            <Button loading={pending} disabled={!name.trim()} onClick={save}>
              <Bookmark className="size-3.5" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
