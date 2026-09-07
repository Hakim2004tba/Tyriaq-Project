"use client";

import { useActionState, useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Textarea,
  toast,
} from "@flow/ui";
import { cn } from "@flow/utils";
import { SPACE_COLOR } from "@/components/shell";
import { createSpace, updateSpace } from "@/lib/actions/space";
import type { ActionResult } from "@/lib/actions/workspace";
import type { Space, SpaceColor } from "@/lib/data/types";
import { SpaceBadge } from "./space-badge";
import { SPACE_COLOR_KEYS, SPACE_ICON_KEYS, SPACE_ICONS } from "./space-icons";

/**
 * One dialog for creating and editing a space.
 *
 * Create and edit ask for exactly the same four things, so two dialogs
 * would guarantee they drift — the only difference is the title, the
 * button, and whether an id rides along.
 *
 * The badge preview sits beside the name because icon and colour are
 * chosen for how they read in the rail at 22px, not in a swatch grid.
 */
export function SpaceEditor({
  open,
  onOpenChange,
  space,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present when editing; absent when creating. */
  space?: Space;
}) {
  const [icon, setIcon] = useState("layers");
  const [color, setColor] = useState<SpaceColor>("violet");

  // Re-seed on every open so a cancelled edit never leaks into the next.
  useEffect(() => {
    if (!open) return;
    setIcon(space?.icon ?? "layers");
    setColor(space?.color ?? "violet");
  }, [open, space]);

  const [state, action] = useActionState<ActionResult, FormData>(async (prev, fd) => {
    const result = space ? await updateSpace(prev, fd) : await createSpace(prev, fd);
    if (result.message) {
      toast.success(result.message);
      onOpenChange(false);
    }
    return result;
  }, {});

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{space ? "Edit space" : "Create a space"}</DialogTitle>
          <DialogDescription>Spaces group the projects and people that belong together.</DialogDescription>
        </DialogHeader>

        <form action={action} className="flex flex-col gap-4">
          {space && <input type="hidden" name="id" value={space.id} />}
          <input type="hidden" name="icon" value={icon} />
          <input type="hidden" name="color" value={color} />

          {state.error && (
            <p role="alert" className="rounded-md border border-danger/30 bg-danger-subtle px-3 py-2 text-body-sm text-danger">
              {state.error}
            </p>
          )}

          <div className="flex items-end gap-3">
            <SpaceBadge icon={icon} color={color} size="lg" />
            <div className="flex-1">
              <label htmlFor="space-name" className="mb-1.5 block text-label text-text-secondary">
                Name
              </label>
              <Input id="space-name" name="name" autoFocus required defaultValue={space?.name ?? ""} placeholder="e.g. Engineering" />
            </div>
          </div>

          <div>
            <label htmlFor="space-desc" className="mb-1.5 block text-label text-text-secondary">
              Description
            </label>
            <Textarea
              id="space-desc"
              name="description"
              defaultValue={space?.description ?? ""}
              placeholder="What belongs in this space?"
              className="min-h-[64px]"
            />
          </div>

          <div>
            <p className="mb-2 text-label text-text-secondary">Colour</p>
            <div className="flex flex-wrap gap-2">
              {SPACE_COLOR_KEYS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Colour ${c}`}
                  aria-pressed={color === c}
                  className={cn(
                    "size-8 rounded-md ring-1 ring-inset transition-all duration-fast",
                    SPACE_COLOR[c].chip,
                    color === c ? "scale-105 shadow-glow-sm ring-white/40" : "hover:scale-105"
                  )}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-label text-text-secondary">Icon</p>
            <div className="flex flex-wrap gap-2">
              {SPACE_ICON_KEYS.map((key) => {
                const Icon = SPACE_ICONS[key]!;
                const on = icon === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setIcon(key)}
                    aria-label={`Icon ${key}`}
                    aria-pressed={on}
                    className={cn(
                      "flex size-8 items-center justify-center rounded-md border transition-colors duration-fast",
                      "focus-visible:outline-none focus-visible:shadow-focus",
                      on
                        ? "border-border-brand bg-primary-subtle text-primary"
                        : "border-border text-text-muted hover:border-border-strong hover:text-text-primary"
                    )}
                  >
                    <Icon className="size-4" />
                  </button>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{space ? "Save changes" : "Create space"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
