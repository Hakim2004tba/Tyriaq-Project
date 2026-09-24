"use client";

import { useTransition } from "react";
import { Check, Flag, Trash2, UserPlus, X } from "lucide-react";
import {
  Avatar,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  toast,
} from "@flow/ui";
import { cn } from "@flow/utils";
import {
  TASK_STATUS_META,
  TASK_STATUS_ORDER,
  type Person,
  type Priority,
  type TaskStatus,
} from "@/lib/data/task-types";
import { useTasks } from "@/components/tasks/task-store";

const PRIORITIES: Priority[] = ["urgent", "high", "medium", "low"];

/**
 * What to do with the tasks somebody has selected.
 *
 * Appears only when something is selected, and floats above the list
 * rather than sitting in the toolbar: the selection is temporary, and a
 * permanent bar full of controls that are disabled most of the time
 * teaches people to stop reading it.
 *
 * Every action here is one the row menu already does one at a time.
 * That is the point — "move eleven tasks to Done" was eleven trips
 * through a dropdown, which is why people stopped tidying up.
 */
export function BulkBar({
  ids,
  people,
  onClear,
}: {
  ids: string[];
  people: Person[];
  onClear: () => void;
}) {
  const store = useTasks();
  const [pending, startTransition] = useTransition();

  if (ids.length === 0) return null;

  const label = `${ids.length} ${ids.length === 1 ? "task" : "tasks"}`;

  /*
    Applied one task at a time rather than in a single request.

    Each of these already has a write path that keeps the store, the
    board and the server in step; a bulk endpoint would be a second
    implementation of the same rules, and the first one to drift would
    be the one nobody is testing.
  */
  function each(what: string, run: (id: string) => void) {
    startTransition(() => {
      for (const id of ids) run(id);
      toast.success(`${label} ${what}.`);
      onClear();
    });
  }

  return (
    <div
      role="region"
      aria-label="Bulk actions"
      className="sticky bottom-4 z-20 mx-auto flex w-fit max-w-full flex-wrap items-center gap-2
                 rounded-xl border border-border-strong bg-surface-elevated px-3 py-2 shadow-card"
    >
      <span className="px-1 text-body-sm font-medium text-text-primary">{label}</span>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="sm" disabled={pending}>
            Status
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="z-[60] w-44">
          <DropdownMenuLabel>Move to</DropdownMenuLabel>
          {TASK_STATUS_ORDER.map((status) => (
            <DropdownMenuItem
              key={status}
              onSelect={() =>
                each(`moved to ${TASK_STATUS_META[status].label}`, (id) =>
                  store.setStatus(id, status as TaskStatus)
                )
              }
            >
              <span
                className={cn("size-2 shrink-0 rounded-full", TASK_STATUS_META[status].accent)}
                aria-hidden="true"
              />
              {TASK_STATUS_META[status].label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="sm" disabled={pending}>
            <Flag className="size-3.5" />
            Priority
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="z-[60] w-40">
          {PRIORITIES.map((priority) => (
            <DropdownMenuItem
              key={priority}
              onSelect={() => each(`set to ${priority}`, (id) => store.updateTask(id, { priority }))}
            >
              <span className="capitalize">{priority}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="sm" disabled={pending}>
            <UserPlus className="size-3.5" />
            Assign
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="z-[60] w-56">
          <DropdownMenuLabel>Add to every selected task</DropdownMenuLabel>
          {people.length === 0 ? (
            <p className="px-2 py-1.5 text-caption text-text-muted">
              Nobody is on this project yet.
            </p>
          ) : (
            people.map((person) => (
              <DropdownMenuItem
                key={person.id}
                onSelect={() =>
                  /*
                    Adds rather than toggles.

                    `toggleAssignee` per task would ADD to the ones
                    without them and REMOVE from the ones with — the
                    same click doing opposite things across a selection
                    is the surprise worth avoiding.
                  */
                  each(`assigned to ${person.name}`, (id) => {
                    const task = store.getTask(id);
                    if (task?.assignees.some((a) => a.id === person.id)) return;
                    store.toggleAssignee(id, person.id);
                  })
                }
              >
                <Avatar name={person.name} src={person.avatarUrl ?? undefined} size="xs" />
                <span className="flex-1 truncate">{person.name}</span>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="secondary"
        size="sm"
        disabled={pending}
        onClick={() => each("completed", (id) => store.setStatus(id, "done"))}
      >
        <Check className="size-3.5" />
        Done
      </Button>

      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => {
          // No confirmation dialog, because this is undone by the same
          // toast that reports it — and a dialog on every bulk action is
          // how people learn to click through dialogs.
          if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;
          each("deleted", (id) => store.deleteTask(id));
        }}
        className="text-danger hover:bg-danger-subtle"
      >
        <Trash2 className="size-3.5" />
        Delete
      </Button>

      <button
        type="button"
        onClick={onClear}
        aria-label="Clear selection"
        className="flex size-7 items-center justify-center rounded-md text-text-muted
                   transition-colors hover:bg-white/[0.06] hover:text-text-primary
                   focus-visible:outline-none focus-visible:shadow-focus"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
