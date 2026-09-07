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
import { SPACE_COLOR_KEYS } from "@/components/spaces/space-icons";
import { createProject, updateProject } from "@/lib/actions/project";
import type { ActionResult } from "@/lib/actions/workspace";
import {
  PROJECT_STATUS_META,
  PROJECT_STATUS_ORDER,
  type Project,
  type ProjectStatus,
  type Space,
  type SpaceColor,
} from "@/lib/data/types";

/**
 * One dialog for creating and editing a project.
 *
 * Editing exposes status and dates; creating does not — a project that has
 * not started cannot meaningfully be "off track", and asking for dates
 * before the work is scoped just produces dates nobody trusts.
 */
export function ProjectEditor({
  open,
  onOpenChange,
  spaces,
  project,
  defaultSpaceId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spaces: Space[];
  project?: Project;
  defaultSpaceId?: string;
}) {
  const [color, setColor] = useState<SpaceColor>("violet");
  const [spaceId, setSpaceId] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("on_track");

  useEffect(() => {
    if (!open) return;
    setColor(project?.color ?? "violet");
    setSpaceId(project?.spaceId ?? defaultSpaceId ?? spaces[0]?.id ?? "");
    setStatus(project?.status ?? "on_track");
  }, [open, project, defaultSpaceId, spaces]);

  const [state, action] = useActionState<ActionResult, FormData>(async (prev, fd) => {
    const result = project ? await updateProject(prev, fd) : await createProject(prev, fd);
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
          <DialogTitle>{project ? "Edit project" : "Create a project"}</DialogTitle>
          <DialogDescription>
            Projects live inside a space and hold the work your team does.
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="flex flex-col gap-4">
          {project && <input type="hidden" name="id" value={project.id} />}
          <input type="hidden" name="color" value={color} />
          <input type="hidden" name="spaceId" value={spaceId} />
          {project && <input type="hidden" name="status" value={status} />}

          {state.error && (
            <p role="alert" className="rounded-md border border-danger/30 bg-danger-subtle px-3 py-2 text-body-sm text-danger">
              {state.error}
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="proj-name" className="text-label text-text-secondary">
              Name
            </label>
            <Input id="proj-name" name="name" autoFocus required defaultValue={project?.name ?? ""} placeholder="e.g. Website redesign" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="proj-space" className="text-label text-text-secondary">
              Space
            </label>
            <select
              id="proj-space"
              value={spaceId}
              onChange={(e) => setSpaceId(e.target.value)}
              className="h-9 w-full rounded-md border border-border bg-surface-muted px-3 text-body text-text-primary
                         focus-visible:border-primary/60 focus-visible:shadow-focus focus-visible:outline-none"
            >
              {spaces.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="proj-desc" className="text-label text-text-secondary">
              Description
            </label>
            <Textarea
              id="proj-desc"
              name="description"
              defaultValue={project?.description ?? ""}
              placeholder="What is this project for?"
              className="min-h-[64px]"
            />
          </div>

          {project && (
            <>
              <div>
                <p className="mb-2 text-label text-text-secondary">Status</p>
                <div className="flex flex-wrap gap-2">
                  {PROJECT_STATUS_ORDER.map((s) => {
                    const meta = PROJECT_STATUS_META[s];
                    const on = status === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStatus(s)}
                        aria-pressed={on}
                        className={cn(
                          "flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-caption font-medium transition-colors",
                          "focus-visible:outline-none focus-visible:shadow-focus",
                          on
                            ? "border-border-brand bg-primary-subtle text-text-primary"
                            : "border-border text-text-muted hover:border-border-strong hover:text-text-primary"
                        )}
                      >
                        <span className={cn("size-1.5 rounded-full", meta.dot)} aria-hidden="true" />
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="proj-start" className="text-label text-text-secondary">
                    Start date
                  </label>
                  <Input id="proj-start" name="startDate" type="date" required={false} defaultValue={project.startDate ?? ""} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="proj-due" className="text-label text-text-secondary">
                    Due date
                  </label>
                  <Input id="proj-due" name="dueDate" type="date" required={false} defaultValue={project.dueDate ?? ""} />
                </div>
              </div>
            </>
          )}

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

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!spaceId}>
              {project ? "Save changes" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
