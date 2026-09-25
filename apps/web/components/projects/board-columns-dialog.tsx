"use client";

import { useState, useTransition } from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
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
  DropdownMenuTrigger,
  Input,
  toast,
} from "@flow/ui";
import { cn } from "@flow/utils";
import { TASK_STATUS_META, TASK_STATUS_ORDER, type TaskStatus } from "@/lib/data/task-types";
import { deleteStatus, enableProjectStatuses, saveStatus } from "@/lib/actions/board";
import type { ProjectStatus } from "@/lib/data/board";

const COLORS = ["neutral", "info", "warning", "danger", "success", "primary"] as const;

const SWATCH: Record<string, string> = {
  neutral: "bg-text-muted",
  info: "bg-info",
  warning: "bg-warning",
  danger: "bg-danger",
  success: "bg-success",
  primary: "bg-primary",
};

/**
 * The columns this board uses.
 *
 * Every column carries a CATEGORY, and the dialog says so plainly,
 * because it is the one thing somebody has to understand before naming
 * a column: "Delivered" can be called anything, but Tyriaq has to be
 * told it means finished, or every progress bar and report about this
 * project will be wrong.
 *
 * That is the honest cost of custom statuses. The alternative — letting
 * a team invent categories too — makes a burndown chart impossible.
 */
export function BoardColumnsDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  statuses,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  statuses: ProjectStatus[];
}) {
  const [rows, setRows] = useState(statuses);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<TaskStatus>("todo");
  const [color, setColor] = useState<string>("neutral");
  const [pending, startTransition] = useTransition();

  function enable() {
    startTransition(async () => {
      const result = await enableProjectStatuses(projectId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Done.");
      onOpenChange(false);
    });
  }

  function add() {
    const label = name.trim();
    if (!label) return;
    startTransition(async () => {
      const result = await saveStatus({ projectId, name: label, category, color });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setRows((current) => [
        ...current,
        { id: `pending-${Date.now()}`, name: label, category, color, position: current.length },
      ]);
      setName("");
      setAdding(false);
      toast.success(result.message ?? "Added.");
    });
  }

  function rename(status: ProjectStatus, next: string) {
    const label = next.trim();
    if (!label || label === status.name) return;
    setRows((current) =>
      current.map((row) => (row.id === status.id ? { ...row, name: label } : row))
    );
    startTransition(async () => {
      const result = await saveStatus({
        id: status.id,
        projectId,
        name: label,
        category: status.category,
        color: status.color,
      });
      if (result.error) {
        setRows(statuses);
        toast.error(result.error);
      }
    });
  }

  function recategorise(status: ProjectStatus, next: TaskStatus) {
    setRows((current) =>
      current.map((row) => (row.id === status.id ? { ...row, category: next } : row))
    );
    startTransition(async () => {
      const result = await saveStatus({
        id: status.id,
        projectId,
        name: status.name,
        category: next,
        color: status.color,
      });
      if (result.error) {
        setRows(statuses);
        toast.error(result.error);
        return;
      }
      toast.success(`${status.name} now counts as ${TASK_STATUS_META[next].label.toLowerCase()}.`);
    });
  }

  function remove(status: ProjectStatus) {
    const previous = rows;
    setRows((current) => current.filter((row) => row.id !== status.id));
    startTransition(async () => {
      const result = await deleteStatus(status.id);
      if (result.error) {
        setRows(previous);
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Removed.");
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Columns on {projectName}</DialogTitle>
          <DialogDescription>
            Name them however your work actually flows. Each one tells Tyriaq what it means, so
            progress and reports keep working.
          </DialogDescription>
        </DialogHeader>

        {rows.length === 0 ? (
          <div className="flex flex-col gap-3 rounded-md border border-dashed border-border-strong px-4 py-5 text-center">
            <p className="text-body-sm text-text-secondary">
              This board uses the five built-in statuses. Give it its own and you can rename them,
              add more, or drop the ones you never use.
            </p>
            <Button loading={pending} onClick={enable} className="self-center">
              Give this board its own columns
            </Button>
            <p className="text-caption text-text-muted">
              Nothing moves — every task is filed into the column matching where it already is.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
            {rows.map((status) => (
              <li key={status.id} className="flex items-center gap-2 px-2.5 py-2">
                <GripVertical className="size-4 shrink-0 text-text-muted/50" aria-hidden="true" />
                <span
                  className={cn("size-2.5 shrink-0 rounded-full", SWATCH[status.color] ?? SWATCH.neutral)}
                  aria-hidden="true"
                />

                <input
                  defaultValue={status.name}
                  onBlur={(event) => rename(status, event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
                  aria-label={`Rename ${status.name}`}
                  className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1.5 py-0.5
                             text-body-sm text-text-primary outline-none hover:border-border
                             focus-visible:border-primary/60 focus-visible:shadow-focus"
                />

                {/*
                  The category is shown as a word, not an icon: "counts
                  as Done" is the sentence somebody needs to read before
                  they trust a report drawn from it.
                */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="shrink-0 rounded px-1.5 py-0.5 text-caption text-text-muted
                                 transition-colors hover:bg-white/[0.06] hover:text-text-secondary
                                 focus-visible:outline-none focus-visible:shadow-focus"
                    >
                      counts as {TASK_STATUS_META[status.category].label.toLowerCase()}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    {TASK_STATUS_ORDER.map((option) => (
                      <DropdownMenuItem key={option} onSelect={() => recategorise(status, option)}>
                        {TASK_STATUS_META[option].label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <button
                  type="button"
                  onClick={() => remove(status)}
                  aria-label={`Remove ${status.name}`}
                  className="flex size-6 shrink-0 items-center justify-center rounded text-text-muted
                             transition-colors hover:bg-danger-subtle hover:text-danger
                             focus-visible:outline-none focus-visible:shadow-focus"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {rows.length > 0 &&
          (adding ? (
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && add()}
                placeholder="Printing"
                aria-label="New column name"
                autoFocus
                className="min-w-[8rem] flex-1"
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="sm">
                    counts as {TASK_STATUS_META[category].label.toLowerCase()}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {TASK_STATUS_ORDER.map((option) => (
                    <DropdownMenuItem key={option} onSelect={() => setCategory(option)}>
                      {TASK_STATUS_META[option].label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <span className="flex items-center gap-1">
                {COLORS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setColor(option)}
                    aria-label={option}
                    className={cn(
                      "size-5 rounded-full ring-1 ring-inset ring-border transition-transform",
                      SWATCH[option],
                      color === option && "scale-110 ring-2 ring-primary"
                    )}
                  />
                ))}
              </span>

              <Button size="sm" loading={pending} disabled={!name.trim()} onClick={add}>
                Add
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setAdding(true)} className="self-start">
              <Plus className="size-3.5" />
              Add a column
            </Button>
          ))}

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
