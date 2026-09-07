import { TODAY, dateFromOffset } from "@/lib/data/task-types";

/**
 * Calendar date maths.
 *
 * Everything is expressed as an OFFSET IN DAYS from the fixture's fixed
 * `TODAY`, never as a live `new Date()`. Tasks already carry offsets, so
 * a shared origin means "is this task due in this cell" is an integer
 * comparison rather than a date-equality check that has to worry about
 * timezones and midnight boundaries.
 */

export const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const WEEKDAY_MIN = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;
export const MONTH_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;
export const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

export type CalendarView = "month" | "week" | "day";

/** Whole days between two dates, ignoring clock time. */
export function offsetOf(date: Date): number {
  const a = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const b = Date.UTC(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());
  return Math.round((a - b) / 86_400_000);
}

/** Monday-first weekday index, 0–6. */
export function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export interface CalendarDay {
  date: Date;
  offset: number;
  outside: boolean;
  isToday: boolean;
  isWeekend: boolean;
}

function makeDay(date: Date, monthOfInterest: number | null): CalendarDay {
  const offset = offsetOf(date);
  return {
    date,
    offset,
    outside: monthOfInterest === null ? false : date.getMonth() !== monthOfInterest,
    isToday: offset === 0,
    isWeekend: date.getDay() === 0 || date.getDay() === 6,
  };
}

/**
 * Six week-rows, Monday first. Always six so the grid's height never
 * changes between months — a calendar that grows a row in March would
 * shove everything below it down the page every time you page forward.
 */
export function monthGrid(cursor: Date): CalendarDay[] {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - mondayIndex(first));
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return makeDay(d, month);
  });
}

export function weekGrid(cursor: Date): CalendarDay[] {
  const start = new Date(cursor);
  start.setDate(cursor.getDate() - mondayIndex(cursor));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return makeDay(d, null);
  });
}

export function dayGrid(cursor: Date): CalendarDay[] {
  return [makeDay(new Date(cursor), null)];
}

export function shiftCursor(cursor: Date, view: CalendarView, direction: -1 | 1): Date {
  const d = new Date(cursor);
  if (view === "month") d.setMonth(d.getMonth() + direction);
  else if (view === "week") d.setDate(d.getDate() + 7 * direction);
  else d.setDate(d.getDate() + direction);
  return d;
}

/** The heading above the grid — "September 2026", "1 – 7 Sep 2026", "Fri 4 September 2026". */
export function rangeLabel(cursor: Date, view: CalendarView): string {
  if (view === "month") return `${MONTH_LONG[cursor.getMonth()]} ${cursor.getFullYear()}`;
  if (view === "day") {
    return `${WEEKDAY_SHORT[mondayIndex(cursor)]} ${cursor.getDate()} ${MONTH_LONG[cursor.getMonth()]} ${cursor.getFullYear()}`;
  }
  const days = weekGrid(cursor);
  const a = days[0]!.date;
  const b = days[6]!.date;
  const sameMonth = a.getMonth() === b.getMonth();
  return sameMonth
    ? `${a.getDate()} – ${b.getDate()} ${MONTH_SHORT[a.getMonth()]} ${a.getFullYear()}`
    : `${a.getDate()} ${MONTH_SHORT[a.getMonth()]} – ${b.getDate()} ${MONTH_SHORT[b.getMonth()]} ${b.getFullYear()}`;
}

export { TODAY, dateFromOffset };
