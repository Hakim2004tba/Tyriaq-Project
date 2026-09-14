"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ArrowDownWideNarrow,
  ChevronsLeftRight,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Plus,
  SplitSquareHorizontal,
  Trash2,
  KanbanSquare,
} from "lucide-react";
import {
  Avatar,
  AvatarGroup,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  IconButton,
  Progress,
} from "@flow/ui";
import { cn } from "@flow/utils";
import {
  TASK_STATUS_META,
  TASK_STATUS_ORDER,
  type Person,
  type Priority,
  type ProjectTask,
  type TaskStatus,
} from "@/lib/data/task-types";
import type { Project } from "@/lib/data/types";
import { useTasks } from "@/components/tasks/task-store";
import { Due, Priority as PriorityFlag, Tag } from "./shared";
import {
  EMPTY_FILTERS,
  TaskToolbar,
  type GroupKey,
  type SortKey,
  type TaskFilters,
} from "./task-toolbar";

const PRIORITY_RANK: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
const PRIORITY_ORDER: Priority[] = ["urgent", "high", "medium", "low"];
const PRIORITY_ACCENT: Record<Priority, string> = {
  urgent: "bg-danger",
  high: "bg-danger/70",
  medium: "bg-warning",
  low: "bg-success",
};

/** A board column: an id to drop onto, a label, and how to apply a drop. */
interface Column {
  id: string;
  label: string;
  accent: string;
  /** Rendered beside the title — an avatar for assignee columns. */
  badge?: React.ReactNode;
  tasks: ProjectTask[];
  /** What changes when a task is dropped here. Null makes the column
   * read-only for drag — see the note in BoardView. */
  apply: ((task: ProjectTask) => void) | null;
}

/* ------------------------------------------------------------------ */
/* Card                                                                */
/* ------------------------------------------------------------------ */

function TaskCard({
  task,
  done,
  dragging,
  draggable,
  onOpen,
  onDragStart,
  onDragEnd,
}: {
  task: ProjectTask;
  done: boolean;
  dragging: boolean;
  draggable: boolean;
  onOpen: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  const subtasks = task.subtasks;
  return (
    <article
      role="button"
      tabIndex={0}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={cn(
        "group rounded-lg border border-border bg-surface p-3 shadow-card",
        "transition-all duration-fast ease-emphasized",
        "hover:-translate-y-px hover:border-border-strong hover:shadow-card-hover",
        "focus-visible:outline-none focus-visible:shadow-focus",
        draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
        // The card stays in place at low opacity rather than being
        // removed: pulling it out of the flow would collapse the column
        // under the cursor mid-drag.
        dragging && "opacity-35"
      )}
    >
      <div className="flex items-start gap-2">
        <p
          className={cn(
            "min-w-0 flex-1 text-body-sm leading-[19px]",
            done ? "text-text-muted line-through" : "text-text-primary"
          )}
        >
          {task.title}
        </p>
        <IconButton
          label={`Options for ${task.title}`}
          size="sm"
          onClick={(e) => e.stopPropagation()}
          className="-mr-1 -mt-1 size-7 shrink-0 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
        >
          <MoreHorizontal className="size-3.5" />
        </IconButton>
      </div>

      {task.tags && task.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {task.tags.map((t) => (
            <Tag key={t}>{t}</Tag>
          ))}
        </div>
      )}

      {subtasks && subtasks.total > 0 && (
        <div className="mt-2.5 flex items-center gap-2">
          <Progress
            value={(subtasks.done / subtasks.total) * 100}
            size="sm"
            label={`${task.title} subtasks`}
            className="flex-1"
          />
          <span className="shrink-0 text-caption tabular text-text-muted">
            {subtasks.done}/{subtasks.total}
          </span>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5 text-caption tabular text-text-muted">
          <Due offset={task.dueOffset} done={done} />
          {task.comments ? (
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="size-3" aria-hidden="true" />
              {task.comments}
            </span>
          ) : null}
          {task.attachments ? (
            <span className="inline-flex items-center gap-1">
              <Paperclip className="size-3" aria-hidden="true" />
              {task.attachments}
            </span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <PriorityFlag value={task.priority} compact />
          <AvatarGroup people={task.assignees.map((a) => ({ id: a.id, name: a.name, avatarUrl: a.avatarUrl }))} max={2} size="xs" />
        </div>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Board                                                               */
/* ------------------------------------------------------------------ */

/**
 * The Kanban board.
 *
 * Columns are DERIVED from the grouping dimension rather than hardcoded
 * to status. That is what lets the same board answer "where is the
 * work", "who is loaded" and "what is urgent" without three separate
 * screens — and dropping a card onto a column applies whatever that
 * column means, so dragging into "Amina" reassigns exactly the way
 * dragging into "In review" re-statuses.
 *
 * Tag columns are the exception: a task can carry several tags, so there
 * is no single unambiguous change a drop could make. Those columns are
 * read-only for drag and the toolbar says so, rather than silently
 * doing something surprising.
 *
 * Drag uses the native HTML5 API — no drag dependency — so every move
 * also has a keyboard path: Alt+←/→ moves a card between columns,
 * Alt+↑/↓ reorders inside one.
 */
export function BoardView({ project, onOpenTask }: { project: Project; onOpenTask: (id: string) => void }) {
  const store = useTasks();
  const [filters, setFilters] = useState<TaskFilters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortKey>("manual");
  const [group, setGroup] = useState<GroupKey>("status");
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropCol, setDropCol] = useState<string | null>(null);
  const [dropBefore, setDropBefore] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [composing, setComposing] = useState<string | null>(null);

  const tags = useMemo(
    () => Array.from(new Set(store.topLevel.flatMap((t) => t.tags ?? []))).sort(),
    [store.topLevel]
  );

  const filtered = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return store.topLevel.filter((t) => {
      if (q && !t.title.toLowerCase().includes(q)) return false;
      if (filters.assignees.length && !t.assignees.some((a) => filters.assignees.includes(a.id))) return false;
      if (filters.priorities.length && !filters.priorities.includes(t.priority)) return false;
      if (filters.tags.length && !(t.tags ?? []).some((tag) => filters.tags.includes(tag))) return false;
      return true;
    });
  }, [store.topLevel, filters]);

  // Memoised, not a bare closure: `columns` is a useMemo that calls this,
  // and a plain function redefined every render cannot be a dependency —
  // so the memo would either be wrong or silently recompute forever.
  const sortRows = useCallback(
    (rows: ProjectTask[]): ProjectTask[] => {
      if (sort === "manual") return rows;
      const copy = [...rows];
      switch (sort) {
        case "due":
          return copy.sort((a, b) => (a.dueOffset ?? Infinity) - (b.dueOffset ?? Infinity));
        case "priority":
          return copy.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
        case "title":
          return copy.sort((a, b) => a.title.localeCompare(b.title));
        case "assignee":
          return copy.sort((a, b) => (a.assignees[0]?.name ?? "").localeCompare(b.assignees[0]?.name ?? ""));
        default:
          return copy;
      }
    },
    [sort]
  );

  const columns: Column[] = useMemo(() => {
    const inCol = (rows: ProjectTask[]) => sortRows(rows);

    if (group === "status") {
      return TASK_STATUS_ORDER.map((s) => ({
        id: s,
        label: TASK_STATUS_META[s].label,
        accent: TASK_STATUS_META[s].accent,
        tasks: inCol(filtered.filter((t) => t.status === s)),
        apply: (task: ProjectTask) => store.setStatus(task.id, s),
      }));
    }

    if (group === "priority") {
      return PRIORITY_ORDER.map((p) => ({
        id: p,
        label: p.charAt(0).toUpperCase() + p.slice(1),
        accent: PRIORITY_ACCENT[p],
        tasks: inCol(filtered.filter((t) => t.priority === p)),
        apply: (task: ProjectTask) => store.updateTask(task.id, { priority: p }),
      }));
    }

    if (group === "assignee") {
      return project.members.map((m: Person) => ({
        id: m.id,
        label: m.name,
        accent: "bg-primary",
        badge: <Avatar name={m.name} size="xs" />,
        tasks: inCol(filtered.filter((t) => t.assignees.some((a) => a.id === m.id))),
        // Dropping onto a person makes them the sole assignee — the
        // unambiguous reading of "move this card to Amina".
        apply: (task: ProjectTask) => store.updateTask(task.id, { assignees: [m] }),
      }));
    }

    return tags.map((tag) => ({
      id: tag,
      label: tag,
      accent: "bg-text-muted",
      tasks: inCol(filtered.filter((t) => (t.tags ?? []).includes(tag))),
      apply: null,
    }));
  }, [group, filtered, sortRows, tags, project.members, store]);

  const dragEnabled = sort === "manual" && group !== "tag";
  const draggedTask = dragId ? store.getTask(dragId) : undefined;

  function commitDrop(col: Column) {
    if (!draggedTask) return;
    if (col.apply) col.apply(draggedTask);
    store.reorderTask(draggedTask.id, dropBefore);
    setDragId(null);
    setDropCol(null);
    setDropBefore(null);
  }

  function onCardKeyDown(e: React.KeyboardEvent, task: ProjectTask, colIdx: number) {
    if (!e.altKey) return;
    const col = columns[colIdx]!;
    const i = col.tasks.findIndex((t) => t.id === task.id);

    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      const target = columns[colIdx + (e.key === "ArrowRight" ? 1 : -1)];
      if (!target || !target.apply) return;
      e.preventDefault();
      target.apply(task);
    } else if (e.key === "ArrowUp" && i > 0) {
      e.preventDefault();
      store.reorderTask(task.id, col.tasks[i - 1]!.id);
    } else if (e.key === "ArrowDown" && i < col.tasks.length - 1) {
      e.preventDefault();
      const after = col.tasks[i + 2];
      store.reorderTask(task.id, after ? after.id : null);
    }
  }

  function submitCompose(col: Column, value: string, input: HTMLInputElement) {
    const title = value.trim();
    if (!title) {
      setComposing(null);
      return;
    }
    // Only status columns can create a card that lands where it was
    // typed; elsewhere it is created in To do and then given the
    // column's property.
    const status: TaskStatus = group === "status" ? (col.id as TaskStatus) : "todo";
    const id = store.addTask(status, title);
    if (group !== "status") {
      const created = { id, title, status, priority: "medium", assignees: [] } as unknown as ProjectTask;
      col.apply?.(created);
    }
    input.value = "";
  }

  const totalShown = columns.reduce((n, c) => n + c.tasks.length, 0);

  return (
    <div className="flex flex-col gap-4">
      <TaskToolbar
        filters={filters}
        onChange={setFilters}
        sort={sort}
        onSortChange={setSort}
        group={group}
        onGroupChange={setGroup}
        people={project.members}
        tags={tags}
        resultCount={filtered.length}
        totalCount={store.topLevel.length}
      />

      {group === "tag" && (
        <p className="text-caption text-text-muted">
          Grouped by tag — cards are read-only here, since a task can carry several tags and a drop would
          have no single meaning. Group by status, assignee or priority to drag.
        </p>
      )}

      {totalShown === 0 && store.topLevel.length === 0 ? (
        // An empty project is not an over-filtered one; the columns
        // themselves are where a task gets added, so they stay.
        <EmptyState
          icon={<KanbanSquare className="size-5" />}
          title="No tasks yet"
          description="Use “Add task” at the foot of a column. The same task shows up in the list, the calendar and the timeline."
        />
      ) : totalShown === 0 ? (
        <EmptyState
          icon={<SplitSquareHorizontal className="size-5" />}
          title="No tasks match"
          description="Adjust the filters or clear them to see the whole board."
          action={
            <Button variant="secondary" size="sm" onClick={() => setFilters(EMPTY_FILTERS)}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex min-h-[26rem] items-start gap-4">
            {columns.map((col, colIdx) => {
              const isCollapsed = collapsed.has(col.id);
              const isDropTarget = dropCol === col.id;

              if (isCollapsed) {
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() =>
                      setCollapsed((prev) => {
                        const n = new Set(prev);
                        n.delete(col.id);
                        return n;
                      })
                    }
                    className="flex h-40 w-12 shrink-0 flex-col items-center gap-3 rounded-lg border border-border
                               bg-surface-muted/60 py-3 transition-colors duration-fast hover:border-border-strong
                               focus-visible:outline-none focus-visible:shadow-focus"
                    aria-label={`Expand ${col.label} column`}
                  >
                    <span className={cn("size-2 shrink-0 rounded-full", col.accent)} aria-hidden="true" />
                    <span className="text-caption tabular text-text-muted">{col.tasks.length}</span>
                    <span
                      className="mt-1 whitespace-nowrap text-body-sm font-medium text-text-secondary"
                      style={{ writingMode: "vertical-rl" }}
                    >
                      {col.label}
                    </span>
                  </button>
                );
              }

              return (
                <section
                  key={col.id}
                  onDragOver={(e) => {
                    if (!dragId || !col.apply) return;
                    e.preventDefault();
                    setDropCol(col.id);
                    if (col.tasks.length === 0) setDropBefore(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    commitDrop(col);
                  }}
                  className={cn(
                    "flex w-[19.5rem] shrink-0 flex-col rounded-lg border bg-surface-muted/60 transition-colors duration-fast",
                    isDropTarget && col.apply ? "border-border-brand bg-primary-subtle/40" : "border-border"
                  )}
                >
                  <header className="flex items-center gap-2 px-3 py-2.5">
                    <span className={cn("size-2 shrink-0 rounded-full", col.accent)} aria-hidden="true" />
                    {col.badge}
                    <h3 className="min-w-0 truncate text-body-sm font-semibold text-text-primary">{col.label}</h3>
                    <span className="shrink-0 rounded-sm bg-white/5 px-1.5 text-caption tabular text-text-muted">
                      {col.tasks.length}
                    </span>

                    <div className="ml-auto flex shrink-0 items-center gap-0.5">
                      <IconButton
                        label={`Add task to ${col.label}`}
                        size="sm"
                        onClick={() => setComposing(col.id)}
                      >
                        <Plus className="size-4" />
                      </IconButton>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <IconButton label={`${col.label} column actions`} size="sm">
                            <MoreHorizontal className="size-4" />
                          </IconButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem onSelect={() => setComposing(col.id)}>
                            <Plus className="size-4" />
                            Add task
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setSort("due")}>
                            <ArrowDownWideNarrow className="size-4" />
                            Sort board by due date
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() =>
                              setCollapsed((prev) => new Set(prev).add(col.id))
                            }
                          >
                            <ChevronsLeftRight className="size-4" />
                            Collapse column
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem disabled destructive>
                            <Trash2 className="size-4" />
                            Clear column
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </header>

                  <div className="flex max-h-[34rem] flex-col gap-2.5 overflow-y-auto px-2.5 pb-2.5">
                    {col.tasks.map((t) => (
                      <div
                        key={t.id}
                        onDragOver={(e) => {
                          if (!dragId || !col.apply) return;
                          e.preventDefault();
                          e.stopPropagation();
                          const box = e.currentTarget.getBoundingClientRect();
                          const below = e.clientY > box.top + box.height / 2;
                          const idx = col.tasks.findIndex((x) => x.id === t.id);
                          const next = below ? col.tasks[idx + 1] : col.tasks[idx];
                          setDropCol(col.id);
                          setDropBefore(next ? next.id : null);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          commitDrop(col);
                        }}
                        onKeyDown={(e) => onCardKeyDown(e, t, colIdx)}
                        className="relative"
                      >
                        {dropCol === col.id && dropBefore === t.id && (
                          <span
                            aria-hidden="true"
                            className="absolute inset-x-0 -top-1.5 z-10 h-0.5 rounded-full bg-brand shadow-glow-sm"
                          />
                        )}
                        <TaskCard
                          task={t}
                          done={t.status === "done"}
                          dragging={dragId === t.id}
                          draggable={dragEnabled}
                          onOpen={() => onOpenTask(t.id)}
                          onDragStart={(e) => {
                            setDragId(t.id);
                            e.dataTransfer.effectAllowed = "move";
                            // Firefox will not start a drag without data.
                            e.dataTransfer.setData("text/plain", t.id);
                          }}
                          onDragEnd={() => {
                            setDragId(null);
                            setDropCol(null);
                            setDropBefore(null);
                          }}
                        />
                      </div>
                    ))}

                    {col.tasks.length === 0 && (
                      <p
                        className={cn(
                          "rounded-lg border border-dashed px-3 py-6 text-center text-caption transition-colors",
                          isDropTarget && col.apply
                            ? "border-border-brand text-primary"
                            : "border-border text-text-muted"
                        )}
                      >
                        {dragId && col.apply ? "Drop here" : "Nothing here"}
                      </p>
                    )}

                    {/* Trailing target so a card can be dropped at the end. */}
                    {dragId && col.apply && col.tasks.length > 0 && (
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDropCol(col.id);
                          setDropBefore(null);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          commitDrop(col);
                        }}
                        className={cn(
                          "h-8 rounded-md border border-dashed transition-colors",
                          dropCol === col.id && dropBefore === null
                            ? "border-border-brand bg-primary-subtle"
                            : "border-transparent"
                        )}
                        aria-hidden="true"
                      />
                    )}

                    {composing === col.id ? (
                      <input
                        autoFocus
                        placeholder="Task name, then Enter"
                        aria-label={`New task in ${col.label}`}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            submitCompose(col, e.currentTarget.value, e.currentTarget);
                          } else if (e.key === "Escape") {
                            setComposing(null);
                          }
                        }}
                        onBlur={(e) => {
                          submitCompose(col, e.currentTarget.value, e.currentTarget);
                          setComposing(null);
                        }}
                        className="h-9 w-full rounded-md border border-primary/60 bg-surface px-3 text-body-sm
                                   text-text-primary shadow-focus placeholder:text-text-muted focus-visible:outline-none"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setComposing(col.id)}
                        className="flex items-center gap-2 rounded-md px-2 py-2 text-body-sm text-text-muted
                                   transition-colors duration-fast hover:bg-white/[0.04] hover:text-text-primary
                                   focus-visible:outline-none focus-visible:shadow-focus"
                      >
                        <Plus className="size-4" />
                        Add task
                      </button>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
