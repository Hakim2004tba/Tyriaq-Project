"use client";

import { forwardRef } from "react";
import { Check, ChevronDown, Plus, Tag as TagIcon } from "lucide-react";
import {
  Avatar,
  AvatarGroup,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@flow/ui";
import { cn } from "@flow/utils";
import { formatDue, offsetFromISO, toISODate } from "@/lib/data/task-types";
import {
  TASK_STATUS_META,
  TASK_STATUS_ORDER,
  type Person,
  type Priority,
  type ProjectTask,
  type TaskStatus,
} from "@/lib/data/task-types";
import { useTasks } from "../task-store";

const PRIORITIES: Priority[] = ["urgent", "high", "medium", "low"];
const PRIORITY_TONE: Record<Priority, string> = {
  urgent: "text-danger",
  high: "text-danger",
  medium: "text-warning",
  low: "text-success",
};
const PRIORITY_DOT: Record<Priority, string> = {
  urgent: "bg-danger",
  high: "bg-danger/70",
  medium: "bg-warning",
  low: "bg-success",
};

/**
 * A labelled row in the panel's property list.
 *
 * Fixed-width labels in a two-column layout rather than stacked
 * label-over-value: properties are scanned vertically for the one you
 * want, and a ragged left edge on the values makes that scan slower.
 */
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <span className="w-24 shrink-0 pt-1 text-caption text-text-muted">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/** A borderless control that only reveals its affordance on hover — the
 * panel is mostly reading, and eight outlined selects would make it look
 * like a form. */
/**
 * The control every property field is built from.
 *
 * Forwards its ref AND spreads the rest of its props, because it is used
 * as `<DropdownMenuTrigger asChild>`. Without both, Radix has nothing to
 * attach to: it hands the trigger's handlers and `aria-expanded` to a
 * component that drops them, and the menu simply never opens — the
 * button takes focus and nothing else happens, which is exactly what it
 * did before this was fixed.
 */
const FieldButton = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ children, className, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    className={cn(
      "flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-body-sm transition-colors duration-fast",
      "hover:bg-white/[0.05] focus-visible:outline-none focus-visible:shadow-focus",
      className
    )}
    {...props}
  >
    {children}
  </button>
));
FieldButton.displayName = "FieldButton";

export function StatusField({ task }: { task: ProjectTask }) {
  const store = useTasks();
  const meta = TASK_STATUS_META[task.status];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <FieldButton>
          <span className={cn("size-2 shrink-0 rounded-full", meta.accent)} aria-hidden="true" />
          <span className="flex-1 truncate text-text-primary">{meta.label}</span>
          <ChevronDown className="size-3.5 shrink-0 text-text-muted" aria-hidden="true" />
        </FieldButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="z-[60] w-48">
        {TASK_STATUS_ORDER.map((s) => (
          <DropdownMenuItem key={s} onSelect={() => store.setStatus(task.id, s)}>
            <span className="flex size-4 items-center justify-center">
              {task.status === s && <Check className="size-4" />}
            </span>
            <span className={cn("size-2 rounded-full", TASK_STATUS_META[s].accent)} aria-hidden="true" />
            {TASK_STATUS_META[s].label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PriorityField({ task }: { task: ProjectTask }) {
  const store = useTasks();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <FieldButton>
          <span className={cn("size-2 shrink-0 rounded-full", PRIORITY_DOT[task.priority])} aria-hidden="true" />
          <span className={cn("flex-1 truncate capitalize", PRIORITY_TONE[task.priority])}>{task.priority}</span>
          <ChevronDown className="size-3.5 shrink-0 text-text-muted" aria-hidden="true" />
        </FieldButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="z-[60] w-44">
        {PRIORITIES.map((p) => (
          <DropdownMenuItem key={p} onSelect={() => store.updateTask(task.id, { priority: p })}>
            <span className="flex size-4 items-center justify-center">
              {task.priority === p && <Check className="size-4" />}
            </span>
            <span className={cn("size-2 rounded-full", PRIORITY_DOT[p])} aria-hidden="true" />
            <span className="capitalize">{p}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AssigneesField({ task, roster }: { task: ProjectTask; roster: Person[] }) {
  const store = useTasks();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <FieldButton>
          <AvatarGroup people={task.assignees.map((a) => ({ id: a.id, name: a.name }))} max={3} size="xs" />
          <span className="flex-1 truncate text-text-primary">
            {task.assignees.length === 0
              ? "Unassigned"
              : task.assignees.length === 1
                ? task.assignees[0]!.name
                : `${task.assignees.length} assignees`}
          </span>
          <Plus className="size-3.5 shrink-0 text-text-muted" aria-hidden="true" />
        </FieldButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="z-[60] w-60">
        {roster.map((p) => {
          const on = task.assignees.some((a) => a.id === p.id);
          return (
            <DropdownMenuItem
              key={p.id}
              onSelect={(e) => {
                e.preventDefault();
                store.toggleAssignee(task.id, p.id);
              }}
            >
              <span className="flex size-4 items-center justify-center">{on && <Check className="size-4" />}</span>
              <Avatar name={p.name} size="xs" />
              <span className="truncate">{p.name}</span>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <p className="px-2.5 py-1 text-caption text-text-muted">
          Only people in this workspace can be assigned.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DatesField({ task }: { task: ProjectTask }) {
  const store = useTasks();
  const overdue = task.status !== "done" && task.dueOffset !== null && task.dueOffset < 0;

  /**
   * Both dates are sent together on every change.
   *
   * The table refuses a start after its due date, so moving one past the
   * other has to arrive as a single pair the database can judge as a
   * whole — and a start date set on a task with no due date would
   * otherwise be checked against a value the row no longer holds.
   */
  function setDate(field: "startOffset" | "dueOffset", value: string) {
    const offset = value ? offsetFromISO(value) : null;
    const next = { startOffset: task.startOffset, dueOffset: task.dueOffset, [field]: offset };
    // Keep the pair ordered rather than letting the write bounce: picking
    // a start beyond the due date means the user moved the whole task.
    if (next.startOffset !== null && next.dueOffset !== null && next.startOffset > next.dueOffset) {
      if (field === "startOffset") next.dueOffset = next.startOffset;
      else next.startOffset = next.dueOffset;
    }
    store.updateTask(task.id, next);
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-1.5 text-body-sm
                        transition-colors focus-within:shadow-focus hover:border-border-strong">
        <span className="shrink-0 text-text-muted">Start</span>
        <input
          type="date"
          value={toISODate(task.startOffset) ?? ""}
          onChange={(e) => setDate("startOffset", e.target.value)}
          className="min-w-0 flex-1 bg-transparent text-right tabular text-text-primary outline-none
                     [color-scheme:dark]"
        />
      </label>
      <label
        className={cn(
          "flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-body-sm transition-colors",
          "focus-within:shadow-focus hover:border-border-strong",
          overdue ? "bg-danger-subtle" : "bg-surface"
        )}
      >
        <span className={cn("shrink-0", overdue ? "text-danger" : "text-text-muted")}>Due</span>
        <input
          type="date"
          value={toISODate(task.dueOffset) ?? ""}
          onChange={(e) => setDate("dueOffset", e.target.value)}
          className={cn(
            "min-w-0 flex-1 bg-transparent text-right tabular outline-none [color-scheme:dark]",
            overdue ? "text-danger" : "text-text-primary"
          )}
        />
      </label>
      <p className="px-0.5 text-caption text-text-muted">
        {task.dueOffset === null ? "No due date" : formatDue(task.dueOffset)}
      </p>
    </div>
  );
}

export function TagsField({ task, available }: { task: ProjectTask; available: string[] }) {
  const store = useTasks();
  const tags = task.tags ?? [];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <FieldButton>
          {tags.length === 0 ? (
            <span className="flex items-center gap-1.5 text-text-muted">
              <TagIcon className="size-3.5" aria-hidden="true" />
              Add tags
            </span>
          ) : (
            <span className="flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span key={t} className="rounded-sm bg-primary-subtle px-1.5 py-0.5 text-caption text-primary">
                  {t}
                </span>
              ))}
            </span>
          )}
        </FieldButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="z-[60] w-52">
        {available.map((t) => (
          <DropdownMenuItem
            key={t}
            onSelect={(e) => {
              e.preventDefault();
              store.toggleTag(task.id, t);
            }}
          >
            <span className="flex size-4 items-center justify-center">
              {tags.includes(t) && <Check className="size-4" />}
            </span>
            {t}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DependenciesField({ task, all }: { task: ProjectTask; all: ProjectTask[] }) {
  const blocks = (task.blocks ?? []).map((id) => all.find((t) => t.id === id)).filter(Boolean) as ProjectTask[];
  const blockedBy = all.filter((t) => (t.blocks ?? []).includes(task.id));

  if (blocks.length === 0 && blockedBy.length === 0) {
    return <span className="px-2 text-body-sm text-text-muted">No dependencies</span>;
  }

  return (
    <div className="flex flex-col gap-2 px-2">
      {blockedBy.length > 0 && (
        <div>
          <p className="text-caption text-text-muted">Blocked by</p>
          <ul className="mt-1 flex flex-col gap-1">
            {blockedBy.map((t) => (
              <li key={t.id} className="flex items-center gap-2">
                <span className={cn("size-1.5 shrink-0 rounded-full", TASK_STATUS_META[t.status].accent)} aria-hidden="true" />
                <span className="truncate text-body-sm text-text-secondary">{t.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {blocks.length > 0 && (
        <div>
          <p className="text-caption text-text-muted">Blocks</p>
          <ul className="mt-1 flex flex-col gap-1">
            {blocks.map((t) => (
              <li key={t.id} className="flex items-center gap-2">
                <span className={cn("size-1.5 shrink-0 rounded-full", TASK_STATUS_META[t.status].accent)} aria-hidden="true" />
                <span className="truncate text-body-sm text-text-secondary">{t.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export { TASK_STATUS_META };
export type { TaskStatus };
