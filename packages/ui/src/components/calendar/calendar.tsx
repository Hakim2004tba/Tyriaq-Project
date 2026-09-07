import * as React from "react";
import type { TaskWithAssignees } from "@flow/types";
import { getMonthGrid, getWeekDates, isSameMonth, isWithinRange, WEEKDAY_LABELS } from "@flow/utils";
import { CalendarDay } from "./calendar-day";

export interface CalendarProps {
  mode: "day" | "month" | "week";
  /** Any date key within the month/week to display (e.g. today, or the
   * currently navigated anchor date). */
  anchorKey: string;
  todayKey: string;
  tasks: TaskWithAssignees[];
  onOpenTask: (task: TaskWithAssignees) => void;
  onCreateTask: (dateKey: string) => void;
}

/**
 * Renders the same shared task array (already filtered/sorted upstream
 * by the Tasks toolbar) as a day agenda, or a week/month grid. Tasks
 * with only a due date appear on that day; tasks with both start and
 * due dates appear on every day in that inclusive range (brief section
 * 4). Tasks with no dates are intentionally never passed in here — they
 * stay List/Board only, filtered out by the caller.
 */
export function Calendar({ mode, anchorKey, todayKey, tasks, onOpenTask, onCreateTask }: CalendarProps) {
  const anchorYear = Number(anchorKey.slice(0, 4));
  const anchorMonth = Number(anchorKey.slice(5, 7)) - 1;

  const weeks = React.useMemo(() => {
    if (mode === "day") return [[anchorKey]];
    if (mode === "week") return [getWeekDates(anchorKey)];
    return getMonthGrid(anchorYear, anchorMonth).weeks;
  }, [mode, anchorKey, anchorYear, anchorMonth]);

  const tasksByDate = React.useMemo(() => {
    const map = new Map<string, TaskWithAssignees[]>();
    for (const task of tasks) {
      const due = task.dueDate;
      const start = task.startDate ?? due;
      if (!due && !start) continue;

      const rangeStart = start && due ? (start <= due ? start : due) : (start ?? due)!;
      const rangeEnd = start && due ? (start <= due ? due : start) : (start ?? due)!;

      for (const week of weeks) {
        for (const dateKey of week) {
          if (isWithinRange(dateKey, rangeStart, rangeEnd)) {
            const list = map.get(dateKey) ?? [];
            list.push(task);
            map.set(dateKey, list);
          }
        }
      }
    }
    // Stable chronological-within-day order: due/start time isn't
    // stored (date-only), so fall back to priority then created date
    // (brief section 9) rather than inventing a time.
    const priorityWeight: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1, none: 0 };
    for (const list of map.values()) {
      list.sort((a, b) => {
        const p = (priorityWeight[b.priority] ?? 0) - (priorityWeight[a.priority] ?? 0);
        if (p !== 0) return p;
        return a.createdAt.localeCompare(b.createdAt);
      });
    }
    return map;
  }, [tasks, weeks]);

  if (mode === "day") {
    const dayTasks = tasksByDate.get(anchorKey) ?? [];
    return (
      <div className="overflow-hidden rounded-lg border border-border">
        <CalendarDay
          dateKey={anchorKey}
          dayNumber={Number(anchorKey.slice(8, 10))}
          isToday={anchorKey === todayKey}
          isOutsideMonth={false}
          tasks={dayTasks}
          onOpenTask={onOpenTask}
          onCreateTask={onCreateTask}
          compact={false}
          fullWidth
        />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border-l border-t border-border">
      <div className="grid grid-cols-7 border-b border-border bg-surface-muted">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="border-r border-border px-2 py-1.5 text-center text-caption font-medium text-text-muted">
            {label}
          </div>
        ))}
      </div>

      {weeks.map((week, i) => (
        <div key={i} className="grid grid-cols-7">
          {week.map((dateKey) => (
            <CalendarDay
              key={dateKey}
              dateKey={dateKey}
              dayNumber={Number(dateKey.slice(8, 10))}
              isToday={dateKey === todayKey}
              isOutsideMonth={mode === "month" && !isSameMonth(dateKey, anchorYear, anchorMonth)}
              tasks={tasksByDate.get(dateKey) ?? []}
              onOpenTask={onOpenTask}
              onCreateTask={onCreateTask}
              compact={mode === "week"}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
