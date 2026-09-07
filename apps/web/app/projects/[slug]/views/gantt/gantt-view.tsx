"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { ChevronDown, GanttChartSquare, Link2Off, Plus } from "lucide-react";
import { Avatar, Button, EmptyState, Tabs, TabsList, TabsTrigger, toast } from "@flow/ui";
import { cn } from "@flow/utils";
import { useTasks } from "@/components/tasks/task-store";
import {
  TASK_STATUS_META,
  TASK_STATUS_ORDER,
  type Person,
  type Priority,
  type ProjectTask,
  type TaskStatus,
} from "@/lib/data/task-types";
import type { Project } from "@/lib/data/types";
import {
  EMPTY_FILTERS,
  TaskToolbar,
  type GroupKey,
  type SortKey,
  type TaskFilters,
} from "../task-toolbar";
import { GanttBar, progressOf, type DragMode } from "./gantt-bar";
import { ZOOM_LEVELS, buildScale, dayLabel, isWeekendDay, type Zoom } from "./gantt-scale";

const ROW_H = 38;
const GROUP_H = 34;
const LABEL_W = 288;
const PRIORITY_RANK: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
const PRIORITY_ORDER: Priority[] = ["urgent", "high", "medium", "low"];

/**
 * A row carries its SECTION id as well as its task.
 *
 * Grouping by assignee legitimately places one task in several sections
 * — that is the point of the view — so a task id alone is not a unique
 * React key. Colliding keys do not merely warn: React reuses the wrong
 * nodes and rows end up rendered outside their section entirely.
 */
type Row =
  | { kind: "group"; id: string; label: string; accent: string; count: number; y: number }
  | { kind: "task"; sectionId: string; task: ProjectTask; y: number };

/** Unique per rendered row, not per task. */
const rowKey = (r: Row) => (r.kind === "group" ? `g:${r.id}` : `t:${r.sectionId}:${r.task.id}`);

interface DragState {
  id: string;
  mode: DragMode;
  originX: number;
  startOffset: number;
  dueOffset: number;
}

/**
 * The Gantt / timeline.
 *
 * Interaction runs on POINTER events rather than the HTML5 drag API used
 * by the list and board. Those views move discrete items between
 * containers, which is what HTML5 drag is for; a Gantt needs continuous
 * pixel deltas snapped to days, edge resizing, and a rubber-band line
 * for dependencies — none of which the drag API can express. Pointer
 * events also cover touch for free.
 *
 * Every mouse gesture has a keyboard equivalent, because a chart you can
 * only reschedule by dragging is a chart half the team cannot use:
 *   Alt+←/→        move the task a day
 *   Alt+Shift+←/→  resize the task by a day
 */
export function GanttView({ project, onOpenTask }: { project: Project; onOpenTask: (id: string) => void }) {
  const store = useTasks();
  const [zoom, setZoom] = useState<Zoom>("day");
  const [group, setGroup] = useState<GroupKey>("status");
  const [sort, setSort] = useState<SortKey>("manual");
  const [filters, setFilters] = useState<TaskFilters>(EMPTY_FILTERS);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [composing, setComposing] = useState<string | null>(null);

  const [drag, setDrag] = useState<DragState | null>(null);
  const [deltaDays, setDeltaDays] = useState(0);
  const [linkCursor, setLinkCursor] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

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

  const sortRows = useCallback(
    (rows: ProjectTask[]): ProjectTask[] => {
      if (sort === "manual") return rows;
      const copy = [...rows];
      switch (sort) {
        case "due":
          // Undated tasks sort last: they have no deadline to be near.
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

  /** Sections, in the order they are drawn. */
  const sections = useMemo(() => {
    const build = (id: string, label: string, accent: string, tasks: ProjectTask[]) => ({
      id,
      label,
      accent,
      tasks: sortRows(tasks),
    });
    if (group === "status") {
      return TASK_STATUS_ORDER.map((s) =>
        build(s, TASK_STATUS_META[s].label, TASK_STATUS_META[s].accent, filtered.filter((t) => t.status === s))
      ).filter((g) => g.tasks.length > 0);
    }
    if (group === "priority") {
      return PRIORITY_ORDER.map((p) =>
        build(
          p,
          p.charAt(0).toUpperCase() + p.slice(1),
          p === "urgent" ? "bg-danger" : p === "high" ? "bg-danger/70" : p === "medium" ? "bg-warning" : "bg-success",
          filtered.filter((t) => t.priority === p)
        )
      ).filter((g) => g.tasks.length > 0);
    }
    if (group === "assignee") {
      return project.members
        .map((m: Person) =>
          build(m.id, m.name, "bg-primary", filtered.filter((t) => t.assignees.some((a) => a.id === m.id)))
        )
        .filter((g) => g.tasks.length > 0);
    }
    return tags
      .map((tag) => build(tag, tag, "bg-text-muted", filtered.filter((t) => (t.tags ?? []).includes(tag))))
      .filter((g) => g.tasks.length > 0);
  }, [group, filtered, sortRows, tags, project.members]);

  /** One flat row list with resolved y positions — bars, gridlines and
   * dependency arrows all measure against the same sequence. */
  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    let y = 0;
    for (const s of sections) {
      out.push({ kind: "group", id: s.id, label: s.label, accent: s.accent, count: s.tasks.length, y });
      y += GROUP_H;
      if (!collapsed.has(s.id)) {
        for (const t of s.tasks) {
          out.push({ kind: "task", sectionId: s.id, task: t, y });
          y += ROW_H;
        }
      }
    }
    return out;
  }, [sections, collapsed]);

  const bodyHeight = rows.reduce((h, r) => h + (r.kind === "group" ? GROUP_H : ROW_H), 0);

  const scale = useMemo(() => {
    const visible = filtered.length > 0 ? filtered : store.topLevel;
    if (visible.length === 0) return buildScale(-7, 21, zoom);
    // Only scheduled tasks can stretch the axis; an undated one has no
    // position on it to argue for.
    const min = Math.min(...visible.map((t) => t.startOffset ?? 0), 0) - 3;
    const max = Math.max(...visible.map((t) => t.dueOffset ?? 0), 0) + 5;
    return buildScale(min, max, zoom);
  }, [filtered, store.topLevel, zoom]);

  const scaleRef = useRef(scale);
  scaleRef.current = scale;

  const rowIndex = useMemo(() => {
    const m = new Map<string, Row & { kind: "task" }>();
    for (const r of rows) if (r.kind === "task") m.set(r.task.id, r);
    return m;
  }, [rows]);

  /* ---------------- pointer interaction ---------------- */

  /**
   * Window listeners are attached IMPERATIVELY here rather than by an
   * effect keyed on drag state.
   *
   * An effect only runs after React has re-rendered, so a quick gesture
   * could finish before `pointerup` was ever being listened for — the
   * drag would silently do nothing. That is not a hypothetical: resizing
   * failed exactly this way until the listeners moved into the gesture
   * that starts them.
   */
  const beginDrag = (e: React.PointerEvent, task: ProjectTask, mode: DragMode) => {
    // Nothing to grab: a task with no dates has no bar on the canvas.
    // Its dates are set in the details panel, and it gains one then.
    if (task.startOffset === null || task.dueOffset === null) return;
    if (sort !== "manual" && mode !== "link") {
      toast.info("Switch to manual order to reschedule by dragging.");
      return;
    }
    e.preventDefault();

    const state: DragState = {
      id: task.id,
      mode,
      originX: e.clientX,
      startOffset: task.startOffset,
      dueOffset: task.dueOffset,
    } as DragState;
    dragRef.current = state;
    setDrag(state);
    setDeltaDays(0);
    if (mode === "link") setLinkCursor({ x: e.clientX, y: e.clientY });

    const dayWidth = scaleRef.current.dayWidth;

    const onMove = (ev: PointerEvent) => {
      if (mode === "link") {
        setLinkCursor({ x: ev.clientX, y: ev.clientY });
        return;
      }
      setDeltaDays(Math.round((ev.clientX - state.originX) / dayWidth));
    };

    const onUp = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      dragRef.current = null;
      setDrag(null);
      setLinkCursor(null);
      setDeltaDays(0);

      if (mode === "link") {
        // Resolve the target from the element under the cursor rather than
        // tracking hover on every bar — one lookup instead of N listeners
        // firing throughout the gesture.
        const el = document.elementFromPoint(ev.clientX, ev.clientY);
        const targetId = el?.closest<HTMLElement>("[data-task-id]")?.dataset.taskId;
        if (targetId) {
          const refusal = store.addDependency(state.id, targetId);
          if (refusal) toast.error(refusal);
          else toast.success("Dependency added.");
        }
        return;
      }

      const delta = Math.round((ev.clientX - state.originX) / dayWidth);
      if (delta === 0) return;
      if (mode === "move") {
        store.updateTask(state.id, {
          startOffset: state.startOffset + delta,
          dueOffset: state.dueOffset + delta,
        });
      } else if (mode === "resize-start") {
        // An edge may never cross the other — a negative duration is not a
        // shorter task, it is a broken one.
        store.updateTask(state.id, { startOffset: Math.min(state.startOffset + delta, state.dueOffset) });
      } else {
        store.updateTask(state.id, { dueOffset: Math.max(state.dueOffset + delta, state.startOffset) });
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  function onBarKeyDown(e: React.KeyboardEvent, task: ProjectTask) {
    if (!e.altKey) return;
    const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (dir === 0) return;
    e.preventDefault();
    if (task.startOffset === null || task.dueOffset === null) return;
    const start = task.startOffset;
    const due = task.dueOffset;
    if (e.shiftKey) {
      store.updateTask(task.id, { dueOffset: Math.max(due + dir, start) });
    } else {
      store.updateTask(task.id, { startOffset: start + dir, dueOffset: due + dir });
    }
  }

  /** `null` for an unscheduled task — it gets no bar and no arrows. */
  const preview = (task: ProjectTask): { start: number; due: number } | null => {
    const d = drag;
    if (!d || d.id !== task.id || d.mode === "link") {
      return task.startOffset === null || task.dueOffset === null
        ? null
        : { start: task.startOffset, due: task.dueOffset };
    }
    if (d.mode === "move") return { start: d.startOffset + deltaDays, due: d.dueOffset + deltaDays };
    if (d.mode === "resize-start") {
      return { start: Math.min(d.startOffset + deltaDays, d.dueOffset), due: d.dueOffset };
    }
    return { start: d.startOffset, due: Math.max(d.dueOffset + deltaDays, d.startOffset) };
  };

  const toggleSection = (id: string) =>
    setCollapsed((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  function createIn(sectionId: string, title: string) {
    const status: TaskStatus = group === "status" ? (sectionId as TaskStatus) : "todo";
    const id = store.addTask(status, title, { startOffset: 0, dueOffset: 3 });
    if (group === "priority") store.updateTask(id, { priority: sectionId as Priority });
    if (group === "assignee") {
      const person = project.members.find((m) => m.id === sectionId);
      if (person) store.updateTask(id, { assignees: [person] });
    }
    if (group === "tag") store.toggleTag(id, sectionId);
  }

  const todayX = scale.x(0) + scale.dayWidth / 2;
  const canvasBox = canvasRef.current?.getBoundingClientRect();

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

      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={zoom} onValueChange={(v) => setZoom(v as Zoom)}>
          <TabsList variant="pill">
            {ZOOM_LEVELS.map((z) => (
              <TabsTrigger key={z.id} value={z.id}>
                {z.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <p className="text-caption text-text-muted">
          Drag a bar to move it, its edges to resize, or the round handle to link a dependency.
        </p>
      </div>

      {rows.length === 0 && store.topLevel.length === 0 ? (
        <EmptyState
          icon={<GanttChartSquare className="size-5" />}
          title="Nothing to schedule yet"
          description="Add tasks in the List or Board view and give them dates — they appear here as bars you can drag, resize and link."
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<GanttChartSquare className="size-5" />}
          title="Nothing to schedule"
          description="No tasks match these filters. Clear them to see the whole timeline."
          action={
            <Button variant="secondary" size="sm" onClick={() => setFilters(EMPTY_FILTERS)}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-card">
          <div className="overflow-x-auto">
            <div className="min-w-fit">
              {/* Header */}
              <div className="flex border-b border-border">
                <div
                  className="sticky left-0 z-30 shrink-0 border-r border-border bg-surface px-4 py-2"
                  style={{ width: LABEL_W }}
                >
                  <span className="text-overline uppercase text-text-muted">Task</span>
                </div>
                <div className="relative shrink-0" style={{ width: scale.width }}>
                  <div className="flex h-6 items-center border-b border-border">
                    {scale.primary.map((b) => (
                      <div
                        key={b.key}
                        className="shrink-0 truncate border-r border-border px-2 text-caption font-medium text-text-secondary"
                        style={{ width: b.span * scale.dayWidth }}
                      >
                        {b.span * scale.dayWidth > 46 ? b.label : ""}
                      </div>
                    ))}
                  </div>
                  <div className="flex h-7 items-center">
                    {scale.secondary.map((b) => {
                      const w = b.span * scale.dayWidth;
                      const today = scale.min + b.start <= 0 && 0 < scale.min + b.start + b.span;
                      return (
                        <div
                          key={b.key}
                          className={cn(
                            "shrink-0 truncate text-center text-[10px] tabular",
                            isWeekendDay(scale, b.start) ? "text-text-muted/50" : "text-text-muted",
                            today && "font-bold text-primary"
                          )}
                          style={{ width: w }}
                        >
                          {w > 14 ? b.label : ""}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="flex">
                {/* Sticky task column — without it a bar scrolled weeks to
                    the right becomes anonymous. */}
                <div
                  className="sticky left-0 z-30 shrink-0 border-r border-border bg-surface"
                  style={{ width: LABEL_W }}
                >
                  {rows.map((r) =>
                    r.kind === "group" ? (
                      <div
                        key={rowKey(r)}
                        className="flex items-center gap-2 border-b border-border bg-surface-muted/60 px-3"
                        style={{ height: GROUP_H }}
                      >
                        <button
                          type="button"
                          onClick={() => toggleSection(r.id)}
                          aria-expanded={!collapsed.has(r.id)}
                          className="flex flex-1 items-center gap-2 rounded text-left focus-visible:outline-none focus-visible:shadow-focus"
                        >
                          <ChevronDown
                            className={cn(
                              "size-3.5 shrink-0 text-text-muted transition-transform duration-fast",
                              collapsed.has(r.id) && "-rotate-90"
                            )}
                            aria-hidden="true"
                          />
                          <span className={cn("size-2 shrink-0 rounded-full", r.accent)} aria-hidden="true" />
                          <span className="min-w-0 truncate text-body-sm font-semibold text-text-primary">
                            {r.label}
                          </span>
                          <span className="shrink-0 text-caption tabular text-text-muted">{r.count}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setComposing(r.id)}
                          aria-label={`Add task to ${r.label}`}
                          className="flex size-6 shrink-0 items-center justify-center rounded text-text-muted
                                     transition-colors hover:bg-white/5 hover:text-text-primary
                                     focus-visible:outline-none focus-visible:shadow-focus"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div
                        key={rowKey(r)}
                        className="flex items-center gap-2 border-b border-border px-3"
                        style={{ height: ROW_H }}
                      >
                        <span
                          className={cn("size-1.5 shrink-0 rounded-full", TASK_STATUS_META[r.task.status].accent)}
                          aria-hidden="true"
                        />
                        <button
                          type="button"
                          onClick={() => onOpenTask(r.task.id)}
                          className={cn(
                            "min-w-0 flex-1 truncate text-left text-body-sm transition-colors rounded",
                            "hover:text-primary focus-visible:outline-none focus-visible:shadow-focus",
                            r.task.status === "done" ? "text-text-muted line-through" : "text-text-primary"
                          )}
                        >
                          {r.task.title}
                        </button>
                        {r.task.blocks && r.task.blocks.length > 0 && (
                          <span
                            className="shrink-0 text-caption tabular text-text-muted"
                            title={`Blocks ${r.task.blocks.length} task(s)`}
                          >
                            ⇥{r.task.blocks.length}
                          </span>
                        )}
                        <span className="shrink-0 text-caption tabular text-text-muted">
                          {progressOf(r.task)}%
                        </span>
                        <Avatar name={r.task.assignees[0]?.name ?? "?"} size="xs" />
                      </div>
                    )
                  )}

                  {composing && (
                    <div className="border-b border-border p-2">
                      <input
                        autoFocus
                        placeholder="Task name, then Enter"
                        aria-label="New task name"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && e.currentTarget.value.trim()) {
                            createIn(composing, e.currentTarget.value.trim());
                            e.currentTarget.value = "";
                          } else if (e.key === "Escape") {
                            setComposing(null);
                          }
                        }}
                        onBlur={(e) => {
                          if (e.currentTarget.value.trim()) createIn(composing, e.currentTarget.value.trim());
                          setComposing(null);
                        }}
                        className="h-8 w-full rounded-md border border-primary/60 bg-surface-muted px-2 text-body-sm
                                   text-text-primary shadow-focus placeholder:text-text-muted focus-visible:outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* Canvas */}
                <div
                  ref={canvasRef}
                  className="relative shrink-0"
                  style={{ width: scale.width, height: bodyHeight }}
                >
                  {/* Gridlines and weekend shading */}
                  {Array.from({ length: Math.ceil(scale.days / scale.gridEvery) }, (_, i) => {
                    const dayIndex = i * scale.gridEvery;
                    const weekend = scale.gridEvery === 1 && isWeekendDay(scale, dayIndex);
                    return (
                      <div
                        key={i}
                        aria-hidden="true"
                        className={cn("absolute top-0 h-full border-r border-border/50", weekend && "bg-white/[0.015]")}
                        style={{ left: dayIndex * scale.dayWidth, width: scale.gridEvery * scale.dayWidth }}
                      />
                    );
                  })}

                  {/* Row bands — group rows tinted so sections read across
                      the whole chart, not only in the name column. */}
                  {rows.map((r) => (
                    <div
                      key={rowKey(r)}
                      aria-hidden="true"
                      className={cn(
                        "absolute left-0 w-full border-b border-border",
                        r.kind === "group" && "bg-surface-muted/60"
                      )}
                      style={{ top: r.y, height: r.kind === "group" ? GROUP_H : ROW_H }}
                    />
                  ))}

                  {/* Today */}
                  <div
                    aria-hidden="true"
                    className="absolute top-0 z-20 h-full w-px bg-primary shadow-[0_0_8px_rgba(139,92,246,0.7)]"
                    style={{ left: todayX }}
                  />

                  {/* Dependency arrows — one overlay for the whole canvas so
                      an edge can cross rows without being clipped. */}
                  <svg
                    className="pointer-events-none absolute inset-0 z-10"
                    width={scale.width}
                    height={bodyHeight}
                    aria-hidden="true"
                  >
                    <defs>
                      <marker id="tq-gantt-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                        <path d="M0,0 L6,3 L0,6 Z" fill="rgba(167,139,250,0.8)" />
                      </marker>
                    </defs>
                    {rows.flatMap((r) => {
                      if (r.kind !== "task") return [];
                      return (r.task.blocks ?? []).map((targetId) => {
                        const target = rowIndex.get(targetId);
                        if (!target) return null;
                        const sp = preview(r.task);
                        const tp = preview(target.task);
                        if (!sp || !tp) return null;
                        const x1 = scale.x(sp.due) + scale.dayWidth;
                        const y1 = r.y + ROW_H / 2;
                        const x2 = scale.x(tp.start);
                        const y2 = target.y + ROW_H / 2;
                        const STUB = 10;
                        // When the successor starts before the predecessor
                        // ends, a plain elbow doubles back and points the
                        // arrowhead the wrong way — route around instead.
                        const doublesBack = x2 - 6 < x1 + STUB;
                        const d = doublesBack
                          ? `M ${x1} ${y1} H ${x1 + STUB} V ${(y1 + y2) / 2} H ${x2 - STUB - 6} V ${y2} H ${x2 - 6}`
                          : `M ${x1} ${y1} H ${x1 + Math.max(STUB, (x2 - x1) / 2)} V ${y2} H ${x2 - 6}`;
                        return (
                          <path
                            key={`${rowKey(r)}-${targetId}`}
                            d={d}
                            fill="none"
                            stroke="rgba(167,139,250,0.55)"
                            strokeWidth="1.5"
                            markerEnd="url(#tq-gantt-arrow)"
                          />
                        );
                      });
                    })}

                    {/* Rubber band while drawing a new dependency. */}
                    {drag?.mode === "link" && linkCursor && canvasBox && (() => {
                      const source = rowIndex.get(drag.id);
                      if (!source) return null;
                      const sp = preview(source.task);
                      if (!sp) return null;
                      const x1 = scale.x(sp.due) + scale.dayWidth;
                      const y1 = source.y + ROW_H / 2;
                      const x2 = linkCursor.x - canvasBox.left;
                      const y2 = linkCursor.y - canvasBox.top;
                      return (
                        <path
                          d={`M ${x1} ${y1} L ${x2} ${y2}`}
                          fill="none"
                          stroke="rgba(167,139,250,0.9)"
                          strokeWidth="1.5"
                          strokeDasharray="4 3"
                        />
                      );
                    })()}
                  </svg>

                  {/* Bars */}
                  {rows.map((r) => {
                    if (r.kind !== "task") return null;
                    const p = preview(r.task);
                    if (!p) return null;
                    return (
                      <GanttBar
                        key={rowKey(r)}
                        task={r.task}
                        scale={scale}
                        top={r.y}
                        height={ROW_H}
                        previewStart={p.start}
                        previewDue={p.due}
                        dragging={drag?.id === r.task.id && drag.mode !== "link"}
                        linking={drag?.mode === "link"}
                        onOpen={() => onOpenTask(r.task.id)}
                        onPointerDown={(e, mode) => beginDrag(e, r.task, mode)}
                        onKeyDown={(e) => onBarKeyDown(e, r.task)}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <footer className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border px-4 py-2.5 text-caption text-text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-5 rounded-sm bg-brand" aria-hidden="true" /> In flight
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-5 rounded-sm bg-warning/60" aria-hidden="true" /> In review
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-5 rounded-sm bg-success/60" aria-hidden="true" /> Done
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-5 rounded-sm bg-danger/60" aria-hidden="true" /> Overdue / blocked
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rotate-45 rounded-[2px] bg-brand" aria-hidden="true" /> Milestone
            </span>
            <span className="ml-auto inline-flex items-center gap-1.5">
              <Link2Off className="size-3" aria-hidden="true" />
              Today is {dayLabel(0)}
            </span>
          </footer>
        </div>
      )}
    </div>
  );
}
