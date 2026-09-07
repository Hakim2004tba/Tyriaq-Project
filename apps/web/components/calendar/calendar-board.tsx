"use client";

import { useCallback, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button, EmptyState, IconButton, Tabs, TabsList, TabsTrigger } from "@flow/ui";
import { cn } from "@flow/utils";
import { useTasks } from "@/components/tasks/task-store";
import type { ProjectTask } from "@/lib/data/task-types";
import type { Project } from "@/lib/data/types";
import {
  EMPTY_FILTERS,
  TaskToolbar,
  type TaskFilters,
} from "@/app/projects/[slug]/views/task-toolbar";
import { CalendarLegend, CalendarTask, type CalendarTaskProps } from "./calendar-atoms";
import { AddOnDayButton, DayComposer } from "./day-composer";
import {
  MONTH_SHORT,
  TODAY,
  WEEKDAY_MIN,
  WEEKDAY_SHORT,
  dayGrid,
  mondayIndex,
  monthGrid,
  rangeLabel,
  shiftCursor,
  weekGrid,
  type CalendarDay,
  type CalendarView,
} from "./calendar-dates";

interface DayDropProps {
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

const VIEWS: { id: CalendarView; label: string }[] = [
  { id: "month", label: "Month" },
  { id: "week", label: "Week" },
  { id: "day", label: "Day" },
];

/** How many chips fit a month cell before it starts counting instead. */
const MONTH_CELL_CAP = 3;

export interface CalendarBoardProps {
  /** Projects a task can belong to — one entry inside a project, all of
   * them on the workspace calendar. */
  projects: Project[];
  projectOf: (taskId: string) => Project | undefined;
  onOpenTask: (id: string) => void;
  /** Records which project a newly created task belongs to. */
  onCreateTask: (taskId: string, projectId: string) => void;
}

/**
 * The Tyriaq calendar.
 *
 * Tasks are placed on their DUE date, not across their start-to-due
 * span. A calendar answers "what is happening that day"; drawing
 * multi-day bars here would duplicate the Gantt while making any single
 * day unreadable.
 *
 * Drag uses the native HTML5 API — no drag dependency, consistent with
 * the list and board — so moving a task also has a keyboard path:
 * Alt+←/→ on a focused task shifts its due date by a day.
 */
export function CalendarBoard({ projects, projectOf, onOpenTask, onCreateTask }: CalendarBoardProps) {
  const store = useTasks();
  const [view, setView] = useState<CalendarView>("month");
  const [cursor, setCursor] = useState<Date>(() => new Date(TODAY));
  const [filters, setFilters] = useState<TaskFilters>(EMPTY_FILTERS);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropOffset, setDropOffset] = useState<number | null>(null);
  const [composeOn, setComposeOn] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const people = useMemo(() => {
    const seen = new Map<string, { id: string; name: string }>();
    for (const p of projects) for (const m of p.members) seen.set(m.id, m);
    return [...seen.values()];
  }, [projects]);

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

  /** Due-date offset → tasks. Built once per render rather than filtering
   * the whole list inside all 42 month cells. */
  const byOffset = useMemo(() => {
    const map = new Map<number, ProjectTask[]>();
    for (const t of filtered) {
      // A task with no due date belongs on no day; the calendar is the
      // one view that cannot show it, and inventing a cell for it would
      // put work on a date nobody chose.
      if (t.dueOffset === null) continue;
      const list = map.get(t.dueOffset);
      if (list) list.push(t);
      else map.set(t.dueOffset, [t]);
    }
    return map;
  }, [filtered]);

  const days: CalendarDay[] =
    view === "month" ? monthGrid(cursor) : view === "week" ? weekGrid(cursor) : dayGrid(cursor);

  const goToday = useCallback(() => setCursor(new Date(TODAY)), []);
  const step = (d: -1 | 1) => setCursor((c) => shiftCursor(c, view, d));

  function commitDrop(offset: number) {
    if (dragId) store.updateTask(dragId, { dueOffset: offset });
    setDragId(null);
    setDropOffset(null);
  }

  function createOn(offset: number, title: string, projectId: string) {
    const id = store.addTask("todo", title, { dueOffset: offset, startOffset: offset });
    onCreateTask(id, projectId);
  }

  function onTaskKeyDown(e: React.KeyboardEvent, task: ProjectTask) {
    if (!e.altKey || task.dueOffset === null) return;
    const due = task.dueOffset;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      store.updateTask(task.id, { dueOffset: due - 1 });
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      store.updateTask(task.id, { dueOffset: due + 1 });
    }
  }

  const dayProps = (day: CalendarDay): DayDropProps => ({
    onDragOver: (e: React.DragEvent) => {
      if (!dragId) return;
      e.preventDefault();
      setDropOffset(day.offset);
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      commitDrop(day.offset);
    },
  });

  const taskProps = (t: ProjectTask): Omit<CalendarTaskProps, "variant"> => ({
    task: t,
    project: projectOf(t.id),
    draggable: true,
    dragging: dragId === t.id,
    onOpen: () => onOpenTask(t.id),
    onDragStart: (e: React.DragEvent) => {
      setDragId(t.id);
      e.dataTransfer.effectAllowed = "move";
      // Firefox will not begin a drag unless data is set.
      e.dataTransfer.setData("text/plain", t.id);
    },
    onDragEnd: () => {
      setDragId(null);
      setDropOffset(null);
    },
  });

  const totalShown = filtered.length;

  return (
    <div className="flex flex-col gap-4">
      {/* Navigation */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <IconButton label={`Previous ${view}`} variant="secondary" size="sm" onClick={() => step(-1)}>
            <ChevronLeft className="size-4" />
          </IconButton>
          <IconButton label={`Next ${view}`} variant="secondary" size="sm" onClick={() => step(1)}>
            <ChevronRight className="size-4" />
          </IconButton>
          <Button variant="secondary" size="sm" onClick={goToday}>
            Today
          </Button>
          <h2 className="ml-1 min-w-0 truncate text-h3 tabular text-text-primary">
            {rangeLabel(cursor, view)}
          </h2>
        </div>

        <Tabs value={view} onValueChange={(v) => setView(v as CalendarView)}>
          <TabsList variant="pill">
            {VIEWS.map((v) => (
              <TabsTrigger key={v.id} value={v.id}>
                {v.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <TaskToolbar
        filters={filters}
        onChange={setFilters}
        people={people}
        tags={tags}
        resultCount={totalShown}
        totalCount={store.topLevel.length}
      />

      {totalShown === 0 ? (
        <EmptyState
          icon={<CalendarDays className="size-5" />}
          title="Nothing scheduled"
          description="No tasks match these filters. Clear them to see everything on the calendar."
          action={
            <Button variant="secondary" size="sm" onClick={() => setFilters(EMPTY_FILTERS)}>
              Clear filters
            </Button>
          }
        />
      ) : view === "month" ? (
        <MonthGrid
          days={days}
          byOffset={byOffset}
          dropOffset={dropOffset}
          dragging={Boolean(dragId)}
          expanded={expanded}
          onToggleExpand={(o) =>
            setExpanded((prev) => {
              const n = new Set(prev);
              if (n.has(o)) n.delete(o);
              else n.add(o);
              return n;
            })
          }
          composeOn={composeOn}
          setComposeOn={setComposeOn}
          projects={projects}
          onCreate={createOn}
          dayProps={dayProps}
          taskProps={taskProps}
          onTaskKeyDown={onTaskKeyDown}
        />
      ) : (
        <ColumnGrid
          days={days}
          view={view}
          byOffset={byOffset}
          dropOffset={dropOffset}
          composeOn={composeOn}
          setComposeOn={setComposeOn}
          projects={projects}
          onCreate={createOn}
          dayProps={dayProps}
          taskProps={taskProps}
          onTaskKeyDown={onTaskKeyDown}
        />
      )}

      <CalendarLegend />
    </div>
  );
}

/* ------------------------------------------------------------------ */

type SharedProps = {
  days: CalendarDay[];
  byOffset: Map<number, ProjectTask[]>;
  dropOffset: number | null;
  composeOn: number | null;
  setComposeOn: (o: number | null) => void;
  projects: Project[];
  onCreate: (offset: number, title: string, projectId: string) => void;
  dayProps: (day: CalendarDay) => DayDropProps;
  taskProps: (t: ProjectTask) => Omit<CalendarTaskProps, "variant">;
  onTaskKeyDown: (e: React.KeyboardEvent, t: ProjectTask) => void;
};

function MonthGrid({
  days,
  byOffset,
  dropOffset,
  dragging,
  expanded,
  onToggleExpand,
  composeOn,
  setComposeOn,
  projects,
  onCreate,
  dayProps,
  taskProps,
  onTaskKeyDown,
}: SharedProps & {
  dragging: boolean;
  expanded: Set<number>;
  onToggleExpand: (offset: number) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-card">
      <div className="grid grid-cols-7 border-b border-border">
        {WEEKDAY_MIN.map((d, i) => (
          <div key={d} className="px-2 py-2 text-center text-overline uppercase text-text-muted">
            <span className="sm:hidden">{d}</span>
            <span className="hidden sm:inline">{WEEKDAY_SHORT[i]}</span>
          </div>
        ))}
      </div>

      {/* Seven columns never squeeze below legibility — the grid scrolls
          inside itself instead. */}
      <div className="overflow-x-auto">
        <div className="grid min-w-[48rem] grid-cols-7">
          {days.map((day, i) => {
            const all = byOffset.get(day.offset) ?? [];
            const isOpen = expanded.has(day.offset);
            const shown = isOpen ? all : all.slice(0, MONTH_CELL_CAP);
            const isDrop = dropOffset === day.offset;

            return (
              <div
                key={i}
                {...dayProps(day)}
                className={cn(
                  "flex min-h-[8.5rem] flex-col gap-1 border-b border-r border-border p-1.5",
                  i % 7 === 6 && "border-r-0",
                  day.outside && "bg-surface-muted/40",
                  day.isWeekend && !day.outside && "bg-white/[0.012]",
                  isDrop && "bg-primary-subtle ring-1 ring-inset ring-border-brand"
                )}
              >
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-md text-caption tabular",
                      day.outside ? "text-text-muted/40" : "text-text-secondary",
                      day.isToday && "bg-brand font-semibold text-white shadow-glow-sm"
                    )}
                  >
                    {day.date.getDate()}
                  </span>
                  {day.date.getDate() === 1 && (
                    <span className="text-[10px] uppercase tracking-wide text-text-muted">
                      {MONTH_SHORT[day.date.getMonth()]}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setComposeOn(day.offset)}
                    aria-label={`Add task on ${day.date.getDate()} ${MONTH_SHORT[day.date.getMonth()]}`}
                    className="ml-auto flex size-5 items-center justify-center rounded text-text-muted opacity-0
                               transition-opacity hover:bg-white/5 hover:text-text-primary
                               focus-visible:opacity-100 focus-visible:outline-none focus-visible:shadow-focus
                               [div:hover>div>&]:opacity-100"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>

                <div className="flex flex-col gap-1">
                  {shown.map((t) => (
                    <div key={t.id} onKeyDown={(e) => onTaskKeyDown(e, t)}>
                      <CalendarTask variant="chip" {...taskProps(t)} />
                    </div>
                  ))}

                  {all.length > MONTH_CELL_CAP && (
                    <button
                      type="button"
                      onClick={() => onToggleExpand(day.offset)}
                      className="rounded px-1.5 text-left text-[11px] tabular text-text-muted transition-colors
                                 hover:text-text-primary focus-visible:outline-none focus-visible:shadow-focus"
                    >
                      {isOpen ? "Show less" : `+${all.length - MONTH_CELL_CAP} more`}
                    </button>
                  )}

                  {composeOn === day.offset && (
                    <DayComposer
                      projects={projects}
                      onCreate={(title, projectId) => onCreate(day.offset, title, projectId)}
                      onCancel={() => setComposeOn(null)}
                    />
                  )}

                  {dragging && all.length === 0 && (
                    <span className="rounded-sm border border-dashed border-border px-1.5 py-1 text-center text-[10px] text-text-muted">
                      Drop
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ColumnGrid({
  days,
  view,
  byOffset,
  dropOffset,
  composeOn,
  setComposeOn,
  projects,
  onCreate,
  dayProps,
  taskProps,
  onTaskKeyDown,
}: SharedProps & { view: CalendarView }) {
  const isDay = view === "day";
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-card">
      <div className={cn("overflow-x-auto", isDay && "overflow-x-visible")}>
        <div
          className={cn("grid", isDay ? "grid-cols-1" : "min-w-[52rem] grid-cols-7")}
        >
          {days.map((day, i) => {
            const all = byOffset.get(day.offset) ?? [];
            const isDrop = dropOffset === day.offset;
            return (
              <section
                key={i}
                {...dayProps(day)}
                className={cn(
                  "flex flex-col border-r border-border",
                  i === days.length - 1 && "border-r-0",
                  day.isWeekend && "bg-white/[0.012]",
                  isDrop && "bg-primary-subtle ring-1 ring-inset ring-border-brand"
                )}
              >
                <header
                  className={cn(
                    "flex items-center gap-2 border-b border-border px-3 py-2",
                    day.isToday && "bg-primary-subtle"
                  )}
                >
                  <span className="text-caption uppercase tracking-wide text-text-muted">
                    {WEEKDAY_SHORT[mondayIndex(day.date)]}
                  </span>
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-md text-caption tabular",
                      day.isToday ? "bg-brand font-semibold text-white shadow-glow-sm" : "text-text-primary"
                    )}
                  >
                    {day.date.getDate()}
                  </span>
                  {isDay && (
                    <span className="text-caption text-text-muted">
                      {MONTH_SHORT[day.date.getMonth()]} {day.date.getFullYear()}
                    </span>
                  )}
                  <span className="ml-auto text-caption tabular text-text-muted">{all.length}</span>
                </header>

                <div
                  className={cn(
                    "flex flex-1 flex-col gap-2 p-2",
                    isDay ? "min-h-[24rem]" : "min-h-[26rem]"
                  )}
                >
                  {all.map((t) => (
                    <div key={t.id} onKeyDown={(e) => onTaskKeyDown(e, t)}>
                      <CalendarTask variant="card" {...taskProps(t)} />
                    </div>
                  ))}

                  {all.length === 0 && (
                    <p className="rounded-md border border-dashed border-border px-2 py-4 text-center text-caption text-text-muted">
                      Nothing due
                    </p>
                  )}

                  {composeOn === day.offset ? (
                    <DayComposer
                      projects={projects}
                      onCreate={(title, projectId) => onCreate(day.offset, title, projectId)}
                      onCancel={() => setComposeOn(null)}
                    />
                  ) : (
                    <AddOnDayButton label="Add task" onClick={() => setComposeOn(day.offset)} />
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
