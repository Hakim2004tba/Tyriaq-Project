"use client";

import { useRef } from "react";
import { Check, Flag, UserPlus } from "lucide-react";
import {
  Avatar,
  AvatarGroup,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@flow/ui";
import { cn } from "@flow/utils";
import {
  TASK_STATUS_META,
  TASK_STATUS_ORDER,
  offsetFromISO,
  toISODate,
  type Person,
  type Priority,
  type ProjectTask,
} from "@/lib/data/task-types";
import { useTasks } from "@/components/tasks/task-store";
import { Due, Priority as PriorityFlag } from "./shared";

/**
 * The controls that live IN a list row.
 *
 * Changing a status, a due date, an assignee or a priority is the most
 * common edit anybody makes, and it was only possible by opening the
 * task. Opening a modal, changing one field and closing it again is four
 * actions for a one-word answer — so each of these is editable where it
 * is displayed.
 *
 * Every one of them stops the click from reaching the row, which would
 * otherwise open the task underneath the menu that was just used.
 */

function stop(event: React.MouseEvent | React.KeyboardEvent) {
  event.stopPropagation();
}

/* ------------------------------------------------------------------ */
/* Status                                                              */
/* ------------------------------------------------------------------ */

export function StatusControl({ task }: { task: ProjectTask }) {
  const store = useTasks();
  const meta = TASK_STATUS_META[task.status];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onClick={stop}
          aria-label={`Status: ${meta.label}. Change it`}
          className="flex size-5 shrink-0 items-center justify-center rounded-full
                     transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:shadow-focus"
        >
          <span className={cn("size-2 rounded-full", meta.accent)} aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="z-[60] w-44" onClick={stop}>
        <DropdownMenuLabel>Status</DropdownMenuLabel>
        {TASK_STATUS_ORDER.map((status) => {
          const item = TASK_STATUS_META[status];
          return (
            <DropdownMenuItem key={status} onSelect={() => store.setStatus(task.id, status)}>
              <span className={cn("size-2 shrink-0 rounded-full", item.accent)} aria-hidden="true" />
              <span className="flex-1">{item.label}</span>
              {task.status === status && <Check className="size-3.5 shrink-0" aria-hidden="true" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ------------------------------------------------------------------ */
/* Assignees                                                           */
/* ------------------------------------------------------------------ */

export function AssigneeControl({ task, people }: { task: ProjectTask; people: Person[] }) {
  const store = useTasks();
  const assigned = new Set(task.assignees.map((person) => person.id));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onClick={stop}
          aria-label={
            task.assignees.length
              ? `Assigned to ${task.assignees.map((p) => p.name).join(", ")}. Change it`
              : "Nobody assigned. Assign somebody"
          }
          className="flex min-h-7 shrink-0 items-center rounded-md px-1 transition-colors
                     hover:bg-white/[0.06] focus-visible:outline-none focus-visible:shadow-focus"
        >
          {task.assignees.length > 0 ? (
            <AvatarGroup
              people={task.assignees.map((person) => ({
                id: person.id,
                name: person.name,
                avatarUrl: person.avatarUrl,
              }))}
              max={2}
              size="xs"
            />
          ) : (
            <UserPlus className="size-3.5 text-text-muted" aria-hidden="true" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[60] w-56" onClick={stop}>
        <DropdownMenuLabel>Assignees</DropdownMenuLabel>
        {people.length === 0 ? (
          <p className="px-2 py-1.5 text-caption text-text-muted">
            Nobody is on this project yet.
          </p>
        ) : (
          people.map((person) => (
            <DropdownMenuItem
              key={person.id}
              // Not `onSelect` closing the menu each time: assigning two
              // people is one intention, and reopening the menu between
              // them is friction for no reason.
              onSelect={(event) => {
                event.preventDefault();
                store.toggleAssignee(task.id, person.id);
              }}
            >
              <Avatar name={person.name} src={person.avatarUrl ?? undefined} size="xs" />
              <span className="flex-1 truncate">{person.name}</span>
              {assigned.has(person.id) && <Check className="size-3.5 shrink-0" aria-hidden="true" />}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ------------------------------------------------------------------ */
/* Due date                                                            */
/* ------------------------------------------------------------------ */

/**
 * A native date input, made to look like the text it replaces.
 *
 * A custom calendar would be more consistent with the rest of the
 * product and worse on a phone, where the platform picker is the one
 * people already know. The input is transparent and sits over the text;
 * clicking anywhere on it opens the picker.
 */
export function DueControl({ task, className }: { task: ProjectTask; className?: string }) {
  const store = useTasks();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const value = toISODate(task.dueOffset) ?? "";

  return (
    <span
      className={cn("relative inline-flex items-center justify-end", className)}
      onClick={stop}
    >
      <Due offset={task.dueOffset} done={task.status === "done"} />
      <input
        ref={inputRef}
        type="date"
        value={value}
        aria-label={`Due date for ${task.title}`}
        onClick={stop}
        onChange={(event) => {
          const next = event.target.value ? offsetFromISO(event.target.value) : null;
          store.updateTask(task.id, { dueOffset: next });
        }}
        /*
          Invisible, but covering the text rather than hidden: an input
          with `display: none` cannot be opened by a click, and one with
          zero size cannot be reached by the keyboard.
        */
        className="absolute inset-0 cursor-pointer opacity-0"
      />
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Priority                                                            */
/* ------------------------------------------------------------------ */

const PRIORITIES: Priority[] = ["urgent", "high", "medium", "low"];

export function PriorityControl({ task, compact }: { task: ProjectTask; compact?: boolean }) {
  const store = useTasks();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onClick={stop}
          aria-label={`Priority: ${task.priority}. Change it`}
          className="flex min-h-7 items-center rounded-md px-1 transition-colors
                     hover:bg-white/[0.06] focus-visible:outline-none focus-visible:shadow-focus"
        >
          <PriorityFlag value={task.priority} compact={compact} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[60] w-40" onClick={stop}>
        <DropdownMenuLabel>Priority</DropdownMenuLabel>
        {PRIORITIES.map((priority) => (
          <DropdownMenuItem key={priority} onSelect={() => store.updateTask(task.id, { priority })}>
            <Flag
              className={cn(
                "size-3.5 shrink-0",
                priority === "urgent" && "fill-current text-danger",
                priority === "high" && "text-danger",
                priority === "medium" && "text-warning",
                priority === "low" && "text-success"
              )}
              aria-hidden="true"
            />
            <span className="flex-1 capitalize">{priority}</span>
            {task.priority === priority && <Check className="size-3.5 shrink-0" aria-hidden="true" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => store.setStatus(task.id, "done")}>
          <Check className="size-3.5 shrink-0 text-success" aria-hidden="true" />
          Mark done
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
