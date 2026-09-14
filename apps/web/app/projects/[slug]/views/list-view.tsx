"use client";

import { useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  CornerDownRight,
  GripVertical,
  Link2,
  MessageSquare,
  Paperclip,
  ListTodo,
  Plus,
  SplitSquareHorizontal,
} from "lucide-react";
import { Badge, Button, EmptyState, Progress } from "@flow/ui";
import { cn } from "@flow/utils";
import {
  TASK_STATUS_META,
  TASK_STATUS_ORDER,
  type Priority,
  type ProjectTask,
  type TaskStatus,
} from "@/lib/data/task-types";
import type { Project } from "@/lib/data/types";
import { useTasks } from "@/components/tasks/task-store";
import { Tag } from "./shared";
import { AssigneeControl, DueControl, PriorityControl, StatusControl } from "./row-controls";
import { EMPTY_FILTERS, TaskToolbar, type SortKey, type TaskFilters } from "./task-toolbar";

const PRIORITY_RANK: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

/** Where a dragged row would land: before this task, or at the group's end. */
interface DropTarget {
  status: TaskStatus;
  beforeId: string | null;
}

/**
 * The task list.
 *
 * Grouped by status, drag-orderable, filterable and searchable, with
 * inline creation per group.
 *
 * DRAG AND DROP uses the native HTML5 API rather than a drag library.
 * That is a deliberate trade: it costs nothing in dependencies — which
 * matters here, since the lockfile is already in an odd state from an
 * earlier tooling bootstrap — but native DnD is mouse-only, so every
 * drag action has an explicit keyboard equivalent (see `onKeyDown`
 * below): Alt+↑/↓ reorders within a group, Alt+←/→ moves between
 * statuses. A drag affordance that only works with a mouse is not an
 * affordance for everyone.
 *
 * Dragging is disabled whenever the sort is not manual, because dropping
 * a row into a position a sort will immediately overwrite is a lie about
 * what the interface just did.
 */
export function ListView({ project, onOpenTask }: { project: Project; onOpenTask: (id: string) => void }) {
  const store = useTasks();
  const [collapsed, setCollapsed] = useState<Set<TaskStatus>>(new Set(["done"]));
  const [filters, setFilters] = useState<TaskFilters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortKey>("manual");
  const [dragId, setDragId] = useState<string | null>(null);
  const [drop, setDrop] = useState<DropTarget | null>(null);
  const [composing, setComposing] = useState<TaskStatus | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const composeRef = useRef<HTMLInputElement>(null);

  /*
    Subtasks, by parent.

    They are deliberately kept OUT of the status groups above — a subtask
    lives with its parent, not in the column its own status would put it
    in, or one piece of work appears twice on the same screen and every
    count on the page is wrong. Here they hang under the row they belong
    to, and each one is editable exactly like a task, because it is one.
  */
  const childrenOf = useMemo(() => {
    const map = new Map<string, ProjectTask[]>();
    for (const task of store.tasks) {
      if (!task.parentId) continue;
      const list = map.get(task.parentId);
      if (list) list.push(task);
      else map.set(task.parentId, [task]);
    }
    return map;
  }, [store.tasks]);

  const people = useMemo(() => project.members, [project.members]);
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

  const sortRows = (rows: ProjectTask[]): ProjectTask[] => {
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
  };

  const dragEnabled = sort === "manual";
  const totalDone = store.topLevel.filter((t) => t.status === "done").length;

  const toggleGroup = (s: TaskStatus) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });

  function commitDrop() {
    if (dragId && drop) store.moveTask(dragId, drop.status, drop.beforeId);
    setDragId(null);
    setDrop(null);
  }

  /** Keyboard equivalents for every drag action. */
  function onRowKeyDown(e: React.KeyboardEvent, task: ProjectTask) {
    if (!e.altKey) return;
    const group = store.orderOf(task.status);
    const i = group.findIndex((t) => t.id === task.id);
    const statusIdx = TASK_STATUS_ORDER.indexOf(task.status);

    if (e.key === "ArrowUp" && i > 0) {
      e.preventDefault();
      store.moveTask(task.id, task.status, group[i - 1]!.id);
    } else if (e.key === "ArrowDown" && i < group.length - 1) {
      e.preventDefault();
      const after = group[i + 2];
      store.moveTask(task.id, task.status, after ? after.id : null);
    } else if (e.key === "ArrowLeft" && statusIdx > 0) {
      e.preventDefault();
      store.moveTask(task.id, TASK_STATUS_ORDER[statusIdx - 1]!, null);
    } else if (e.key === "ArrowRight" && statusIdx < TASK_STATUS_ORDER.length - 1) {
      e.preventDefault();
      store.moveTask(task.id, TASK_STATUS_ORDER[statusIdx + 1]!, null);
    }
  }

  function submitCompose(status: TaskStatus, value: string) {
    const title = value.trim();
    if (!title) {
      setComposing(null);
      return;
    }
    store.addTask(status, title);
    // Stay in compose mode: adding tasks is almost always done in runs,
    // and making someone re-click "Add task" for each one is the fastest
    // way to make inline creation feel slower than a modal.
    if (composeRef.current) composeRef.current.value = "";
  }

  const anyResults = filtered.length > 0;
  /*
    An empty project and an over-filtered one are different problems.

    Telling somebody with no tasks at all to "clear the filters" sends
    them looking for a setting that is not the reason, and leaves no way
    to make the first task — the composer lives inside a status group,
    and there are no groups to show yet.
  */
  const projectIsEmpty = store.topLevel.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <TaskToolbar
        filters={filters}
        onChange={setFilters}
        sort={sort}
        onSortChange={setSort}
        people={people}
        tags={tags}
        resultCount={filtered.length}
        totalCount={store.topLevel.length}
      />

      <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-2.5 shadow-card">
        <span className="text-caption text-text-muted">Project progress</span>
        <Progress
          value={store.topLevel.length ? (totalDone / store.topLevel.length) * 100 : 0}
          label="Project progress"
          className="flex-1"
        />
        <span className="shrink-0 text-caption tabular text-text-secondary">
          {totalDone}/{store.topLevel.length}
        </span>
      </div>

      {!anyResults && (
        projectIsEmpty ? (
          <EmptyState
            icon={<ListTodo className="size-5" />}
            title="No tasks yet"
            description="Add the first one and it appears here, on the board, in the calendar and on the timeline — it is the same task in all four."
            action={
              <Button size="sm" onClick={() => setComposing("todo")}>
                <Plus className="size-4" />
                Add a task
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={<SplitSquareHorizontal className="size-5" />}
            title="No tasks match"
            description="Adjust the filters or clear them to see the whole project."
            action={
              <Button variant="secondary" size="sm" onClick={() => setFilters(EMPTY_FILTERS)}>
                Clear filters
              </Button>
            }
          />
        )
      )}

      {(anyResults || (projectIsEmpty && composing !== null)) &&
        TASK_STATUS_ORDER.map((status) => {
          const rows = sortRows(filtered.filter((t) => t.status === status));
          const meta = TASK_STATUS_META[status];
          const isOpen = !collapsed.has(status);
          const isDropGroup = drop?.status === status;

          // A group with no matches still renders when a drag is in
          // flight — otherwise there is nowhere to drop a task to change
          // its status to something nothing currently has — and when it
          // is the group the first task is being typed into.
          if (rows.length === 0 && !dragId && composing !== status) return null;

          return (
            <section
              key={status}
              onDragOver={(e) => {
                if (!dragId) return;
                e.preventDefault();
                if (rows.length === 0) setDrop({ status, beforeId: null });
              }}
              onDrop={(e) => {
                e.preventDefault();
                commitDrop();
              }}
              className={cn(
                "overflow-hidden rounded-lg border bg-surface shadow-card transition-colors duration-fast",
                isDropGroup ? "border-border-brand" : "border-border"
              )}
            >
              <div className="flex items-center gap-2.5 px-4 py-2.5">
                <button
                  type="button"
                  onClick={() => toggleGroup(status)}
                  aria-expanded={isOpen}
                  className="flex flex-1 items-center gap-2.5 rounded text-left transition-colors duration-fast
                             hover:text-text-primary focus-visible:outline-none focus-visible:shadow-focus"
                >
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 text-text-muted transition-transform duration-fast",
                      !isOpen && "-rotate-90"
                    )}
                    aria-hidden="true"
                  />
                  <span className={cn("size-2 shrink-0 rounded-full", meta.accent)} aria-hidden="true" />
                  <span className="text-body-sm font-semibold text-text-primary">{meta.label}</span>
                  <span className="text-caption tabular text-text-muted">{rows.length}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setComposing(status)}
                  className="flex size-7 items-center justify-center rounded-md text-text-muted transition-colors
                             duration-fast hover:bg-white/5 hover:text-text-primary
                             focus-visible:outline-none focus-visible:shadow-focus"
                  aria-label={`Add task to ${meta.label}`}
                >
                  <Plus className="size-4" />
                </button>
              </div>

              {isOpen && (
                <ul className="border-t border-border">
                  {rows.length === 0 && (
                    <li className="px-4 py-6 text-center text-caption text-text-muted">Drop here</li>
                  )}

                  {rows.map((t) => {
                    const isDragging = dragId === t.id;
                    const showLine = drop?.status === status && drop.beforeId === t.id;
                    const kids = childrenOf.get(t.id) ?? [];
                    const isExpanded = expanded.has(t.id);
                    return (
                      <li
                        key={t.id}
                        draggable={dragEnabled}
                        onDragStart={(e) => {
                          setDragId(t.id);
                          e.dataTransfer.effectAllowed = "move";
                          // Firefox refuses to start a drag without data set.
                          e.dataTransfer.setData("text/plain", t.id);
                        }}
                        onDragEnd={() => {
                          setDragId(null);
                          setDrop(null);
                        }}
                        onDragOver={(e) => {
                          if (!dragId) return;
                          e.preventDefault();
                          const box = e.currentTarget.getBoundingClientRect();
                          const below = e.clientY > box.top + box.height / 2;
                          const group = sortRows(filtered.filter((x) => x.status === status));
                          const idx = group.findIndex((x) => x.id === t.id);
                          const next = below ? group[idx + 1] : group[idx];
                          setDrop({ status, beforeId: next ? next.id : null });
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          commitDrop();
                        }}
                        className={cn(
                          "relative border-b border-border last:border-b-0 transition-opacity duration-fast",
                          isDragging && "opacity-40"
                        )}
                      >
                        {showLine && (
                          <span
                            aria-hidden="true"
                            className="absolute inset-x-0 -top-px z-10 h-0.5 rounded-full bg-brand shadow-glow-sm"
                          />
                        )}

                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => onOpenTask(t.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              onOpenTask(t.id);
                            } else {
                              onRowKeyDown(e, t);
                            }
                          }}
                          aria-label={`${t.title} — ${meta.label}. Alt with arrow keys moves this task.`}
                          className="group flex w-full cursor-pointer items-center gap-2.5 px-2 py-2.5 text-left
                                     transition-colors duration-fast hover:bg-white/[0.025]
                                     focus-visible:outline-none focus-visible:bg-white/[0.04]"
                        >
                          <span
                            className={cn(
                              "flex size-5 shrink-0 items-center justify-center text-text-muted",
                              dragEnabled ? "cursor-grab active:cursor-grabbing" : "opacity-25"
                            )}
                            aria-hidden="true"
                          >
                            <GripVertical className="size-4" />
                          </span>

                          <StatusControl task={t} />

                          {/*
                            Always present, even at zero, because it is
                            also how a subtask gets ADDED from here —
                            and it fades when there is nothing under it
                            so a full list still reads at a glance.
                          */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpanded((current) => {
                                const next = new Set(current);
                                if (next.has(t.id)) next.delete(t.id);
                                else next.add(t.id);
                                return next;
                              });
                              // Expanding a task with nothing under it
                              // can only mean one thing.
                              if (kids.length === 0 && !isExpanded) setAddingTo(t.id);
                            }}
                            aria-expanded={isExpanded}
                            aria-label={
                              kids.length > 0
                                ? `${isExpanded ? "Hide" : "Show"} ${kids.length} subtask${kids.length === 1 ? "" : "s"}`
                                : `Add a subtask to ${t.title}`
                            }
                            className={cn(
                              "flex size-5 shrink-0 items-center justify-center rounded text-text-muted",
                              "transition-colors hover:bg-white/10 hover:text-text-primary",
                              "focus-visible:outline-none focus-visible:shadow-focus",
                              kids.length === 0 && "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                            )}
                          >
                            <ChevronRight
                              className={cn(
                                "size-3.5 transition-transform duration-fast",
                                isExpanded && "rotate-90"
                              )}
                              aria-hidden="true"
                            />
                          </button>

                          <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2.5">
                            <span
                              className={cn(
                                "truncate text-body-sm",
                                status === "done" ? "text-text-muted line-through" : "text-text-primary"
                              )}
                            >
                              {t.title}
                            </span>

                            <span className="flex min-w-0 items-center gap-2">
                              {t.tags?.slice(0, 2).map((tag) => <Tag key={tag}>{tag}</Tag>)}
                              <span className="hidden items-center gap-2 text-caption tabular text-text-muted 2xl:flex">
                                {t.subtasks && (
                                  <span className="inline-flex items-center gap-1">
                                    <SplitSquareHorizontal className="size-3" aria-hidden="true" />
                                    {t.subtasks.done}/{t.subtasks.total}
                                  </span>
                                )}
                                {t.comments ? (
                                  <span className="inline-flex items-center gap-1">
                                    <MessageSquare className="size-3" aria-hidden="true" />
                                    {t.comments}
                                  </span>
                                ) : null}
                                {t.attachments ? (
                                  <span className="inline-flex items-center gap-1">
                                    <Paperclip className="size-3" aria-hidden="true" />
                                    {t.attachments}
                                  </span>
                                ) : null}
                                {t.blocks?.length ? (
                                  <span className="inline-flex items-center gap-1" title="Blocks other tasks">
                                    <Link2 className="size-3" aria-hidden="true" />
                                    {t.blocks.length}
                                  </span>
                                ) : null}
                              </span>
                              <span className="sm:hidden">
                                <DueControl task={t} />
                              </span>
                            </span>
                          </div>

                          {t.milestone && (
                            <Badge variant="primary" size="sm" className="hidden shrink-0 lg:inline-flex">
                              Milestone
                            </Badge>
                          )}
                          {/*
                            Editable in place. Changing a due date or an
                            assignee is the most common edit anybody
                            makes, and opening the task to do it is four
                            actions for a one-word answer.
                          */}
                          <span className="hidden shrink-0 sm:block">
                            <AssigneeControl task={t} people={people} />
                          </span>
                          <DueControl task={t} className="hidden w-24 sm:inline-flex" />
                          <span className="hidden w-16 shrink-0 justify-end sm:flex">
                            <PriorityControl task={t} />
                          </span>
                          <span className="shrink-0 sm:hidden">
                            <PriorityControl task={t} compact />
                          </span>
                        </div>

                        {/*
                          Subtasks, under the thing they belong to.

                          Indented and quieter, but carrying the same
                          controls: a subtask is a task — same table,
                          same fields — and having to open the parent to
                          reassign one was the whole complaint.
                        */}
                        {isExpanded && (
                          <ul className="border-t border-border bg-surface-muted/30">
                            {kids.map((kid) => (
                              <li key={kid.id} className="border-b border-border/60 last:border-b-0">
                                <div
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => onOpenTask(kid.id)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      onOpenTask(kid.id);
                                    }
                                  }}
                                  className="flex w-full cursor-pointer items-center gap-2.5 py-2 pl-10 pr-2 text-left
                                             transition-colors duration-fast hover:bg-white/[0.025]
                                             focus-visible:outline-none focus-visible:bg-white/[0.04]"
                                >
                                  <CornerDownRight
                                    className="size-3.5 shrink-0 text-text-muted"
                                    aria-hidden="true"
                                  />
                                  <StatusControl task={kid} />

                                  <span
                                    className={cn(
                                      "min-w-0 flex-1 truncate text-body-sm",
                                      kid.status === "done"
                                        ? "text-text-muted line-through"
                                        : "text-text-secondary"
                                    )}
                                  >
                                    {kid.title}
                                  </span>

                                  <span className="hidden shrink-0 sm:block">
                                    <AssigneeControl task={kid} people={people} />
                                  </span>
                                  <DueControl task={kid} className="hidden w-24 sm:inline-flex" />
                                  <span className="hidden w-16 shrink-0 justify-end sm:flex">
                                    <PriorityControl task={kid} />
                                  </span>
                                  <span className="shrink-0 sm:hidden">
                                    <PriorityControl task={kid} compact />
                                  </span>
                                </div>
                              </li>
                            ))}

                            <li>
                              {addingTo === t.id ? (
                                <input
                                  autoFocus
                                  placeholder="Subtask, then Enter"
                                  aria-label={`New subtask in ${t.title}`}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      const value = e.currentTarget.value.trim();
                                      if (value) store.addSubtask(t.id, value);
                                      e.currentTarget.value = "";
                                    } else if (e.key === "Escape") {
                                      setAddingTo(null);
                                    }
                                  }}
                                  onBlur={() => setAddingTo(null)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="mx-2 my-1.5 h-7 w-[calc(100%-1rem)] rounded-md border border-primary/60
                                             bg-surface px-2.5 text-caption text-text-primary shadow-focus
                                             placeholder:text-text-muted focus-visible:outline-none"
                                />
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAddingTo(t.id);
                                  }}
                                  className="flex w-full items-center gap-1.5 py-1.5 pl-10 text-caption text-text-muted
                                             transition-colors hover:text-text-primary
                                             focus-visible:outline-none focus-visible:bg-white/[0.04]"
                                >
                                  <Plus className="size-3" aria-hidden="true" />
                                  Add subtask
                                </button>
                              )}
                            </li>
                          </ul>
                        )}
                      </li>
                    );
                  })}

                  {/* Trailing drop zone so a task can be moved to the end. */}
                  {dragId && (
                    <li
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDrop({ status, beforeId: null });
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        commitDrop();
                      }}
                      className={cn(
                        "h-8 border-t border-dashed transition-colors",
                        drop?.status === status && drop.beforeId === null
                          ? "border-border-brand bg-primary-subtle"
                          : "border-transparent"
                      )}
                      aria-hidden="true"
                    />
                  )}
                </ul>
              )}

              {isOpen &&
                (composing === status ? (
                  <div className="border-t border-border px-4 py-2">
                    <input
                      ref={composeRef}
                      autoFocus
                      placeholder="Task name, then Enter — Escape to finish"
                      aria-label={`New task in ${meta.label}`}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          submitCompose(status, e.currentTarget.value);
                        } else if (e.key === "Escape") {
                          setComposing(null);
                        }
                      }}
                      onBlur={(e) => submitCompose(status, e.currentTarget.value)}
                      className="h-8 w-full rounded-md border border-primary/60 bg-surface-muted px-3 text-body-sm
                                 text-text-primary shadow-focus placeholder:text-text-muted focus-visible:outline-none"
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setComposing(status)}
                    className="flex w-full items-center gap-2 border-t border-border px-4 py-2.5 text-body-sm
                               text-text-muted transition-colors duration-fast hover:text-text-primary
                               focus-visible:outline-none focus-visible:shadow-focus"
                  >
                    <Plus className="size-4" />
                    Add task
                  </button>
                ))}
            </section>
          );
        })}
    </div>
  );
}
