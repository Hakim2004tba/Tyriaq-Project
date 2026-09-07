import * as React from "react";
import type { TaskWithAssignees } from "@flow/types";
import { addDays, fromDateKey } from "@flow/utils";

const DAY_WIDTH = 32;
const ROW_HEIGHT = 40;
const TITLE_COL_WIDTH = 220;

export interface TimelineDependencyEdge {
  /** The blocking task's id — the connector runs FROM this task's bar
   * end TO the blocked task's bar start. */
  taskId: string;
  relatedTaskId: string;
}

export interface TaskTimelineProps {
  tasks: TaskWithAssignees[];
  /** `blocks`-type dependency edges among the visible tasks — computed
   * by the caller from the same batched query already used for the
   * List/Board "Blocked" badge (Phase 14), never fetched again here. */
  dependencyEdges: TimelineDependencyEdge[];
  rangeStartKey: string;
  rangeEndKey: string;
  todayKey: string;
  onOpenTask: (task: TaskWithAssignees) => void;
}

const STATUS_BAR_CLASSES: Record<string, string> = {
  todo: "bg-text-muted",
  in_progress: "bg-primary",
  review: "bg-warning",
  done: "bg-success",
};

/**
 * A Gantt-style view: one row per task, a horizontal bar spanning its
 * start→due date range, plus connector lines for `blocks` dependencies.
 * Tasks with only one date render as a single-day marker. Tasks with
 * neither date are never passed in here — same "no dates, stays
 * List/Board only" rule Calendar already follows.
 */
export function TaskTimeline({ tasks, dependencyEdges, rangeStartKey, rangeEndKey, todayKey, onOpenTask }: TaskTimelineProps) {
  const days = React.useMemo(() => {
    const result: string[] = [];
    let cursor = rangeStartKey;
    while (cursor <= rangeEndKey) {
      result.push(cursor);
      cursor = addDays(cursor, 1);
    }
    return result;
  }, [rangeStartKey, rangeEndKey]);

  const dayIndex = React.useCallback(
    (dateKey: string) => Math.round((fromDateKey(dateKey).getTime() - fromDateKey(rangeStartKey).getTime()) / 86_400_000),
    [rangeStartKey]
  );

  const rowIndexByTask = React.useMemo(() => {
    const map = new Map<string, number>();
    tasks.forEach((t, i) => map.set(t.id, i));
    return map;
  }, [tasks]);

  const gridWidth = days.length * DAY_WIDTH;
  const gridHeight = tasks.length * ROW_HEIGHT;
  const todayIndex = todayKey >= rangeStartKey && todayKey <= rangeEndKey ? dayIndex(todayKey) : null;

  if (tasks.length === 0) {
    return <p className="p-6 text-center text-body-sm text-text-muted">No dated tasks in this range.</p>;
  }

  return (
    <div className="overflow-auto rounded-lg border border-border">
      <div style={{ width: TITLE_COL_WIDTH + gridWidth, minWidth: "100%" }}>
        <div className="flex border-b border-border bg-surface-muted" style={{ height: 32 }}>
          <div style={{ width: TITLE_COL_WIDTH }} className="shrink-0 border-r border-border px-3 py-1.5 text-caption font-medium text-text-muted">
            Task
          </div>
          <div className="relative flex" style={{ width: gridWidth }}>
            {days.map((day) => (
              <div
                key={day}
                style={{ width: DAY_WIDTH }}
                className={
                  "shrink-0 border-r border-border/60 text-center text-caption " +
                  (day === todayKey ? "font-bold text-primary" : "text-text-muted")
                }
              >
                {Number(day.slice(8, 10))}
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex">
          <div style={{ width: TITLE_COL_WIDTH }} className="shrink-0 divide-y divide-border border-r border-border">
            {tasks.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => onOpenTask(task)}
                style={{ height: ROW_HEIGHT }}
                className="flex w-full items-center truncate px-3 text-left text-body-sm text-text-primary hover:text-primary"
              >
                <span className="truncate">{task.title}</span>
              </button>
            ))}
          </div>

          <div className="relative" style={{ width: gridWidth, height: gridHeight }}>
            {days.map((day, i) => (
              <div
                key={day}
                className="absolute top-0 border-r border-border/40"
                style={{ left: i * DAY_WIDTH, width: DAY_WIDTH, height: gridHeight }}
              />
            ))}
            {todayIndex !== null && (
              <div className="absolute top-0 w-px bg-danger" style={{ left: todayIndex * DAY_WIDTH, height: gridHeight }} />
            )}

            <svg className="pointer-events-none absolute left-0 top-0" width={gridWidth} height={gridHeight}>
              {dependencyEdges.map((edge, i) => {
                const blockerRow = rowIndexByTask.get(edge.taskId);
                const blockedRow = rowIndexByTask.get(edge.relatedTaskId);
                const blocker = tasks.find((t) => t.id === edge.taskId);
                const blocked = tasks.find((t) => t.id === edge.relatedTaskId);
                if (blockerRow === undefined || blockedRow === undefined || !blocker || !blocked) return null;
                if (!blocker.dueDate && !blocker.startDate) return null;
                if (!blocked.startDate && !blocked.dueDate) return null;

                const blockerEndKey = blocker.dueDate ?? blocker.startDate!;
                const blockedStartKey = blocked.startDate ?? blocked.dueDate!;
                const x1 = (dayIndex(blockerEndKey) + 1) * DAY_WIDTH;
                const y1 = blockerRow * ROW_HEIGHT + ROW_HEIGHT / 2;
                const x2 = dayIndex(blockedStartKey) * DAY_WIDTH;
                const y2 = blockedRow * ROW_HEIGHT + ROW_HEIGHT / 2;
                const midX = (x1 + x2) / 2;

                return (
                  <path
                    key={i}
                    d={`M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`}
                    fill="none"
                    stroke="rgb(var(--color-danger))"
                    strokeWidth={1.5}
                    strokeDasharray="3 2"
                  />
                );
              })}
            </svg>

            {tasks.map((task, i) => {
              const startKey = task.startDate ?? task.dueDate;
              const endKey = task.dueDate ?? task.startDate;
              if (!startKey || !endKey) return null;
              const startIdx = Math.max(0, dayIndex(startKey));
              const endIdx = Math.min(days.length - 1, dayIndex(endKey));
              if (endIdx < 0 || startIdx > days.length - 1) return null;
              const left = startIdx * DAY_WIDTH;
              const width = Math.max(DAY_WIDTH - 4, (endIdx - startIdx + 1) * DAY_WIDTH - 4);

              return (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => onOpenTask(task)}
                  className={
                    "absolute rounded-md text-left text-caption font-medium text-white shadow-xs transition-opacity hover:opacity-90 " +
                    (STATUS_BAR_CLASSES[task.status] ?? "bg-text-muted")
                  }
                  style={{ left: left + 2, top: i * ROW_HEIGHT + 8, width, height: ROW_HEIGHT - 16 }}
                  title={task.title}
                >
                  <span className="block truncate px-2 leading-[24px]">{task.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
