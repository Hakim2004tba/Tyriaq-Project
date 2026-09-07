/**
 * Calendar grid date utilities.
 *
 * DATE HANDLING STRATEGY (see Phase 05 report for the full rationale):
 * task start_date/due_date are Postgres `date` columns, which arrive
 * from Supabase as plain "YYYY-MM-DD" strings with no time or timezone
 * component. This file treats them as opaque calendar dates throughout
 * — comparisons use plain string/lexicographic ordering (which is valid
 * for zero-padded ISO date strings) or a single `Date` constructed at
 * local noon, never `new Date(isoString)` directly (which JS parses as
 * UTC midnight, shifting the displayed day backward in any timezone
 * behind UTC). This is the same pattern already used by
 * ../lib/task-date.ts (formatTaskDate/getDueDateUrgency) — this file
 * extends it to month/week grid generation rather than introducing a
 * second date convention.
 */

/** "YYYY-MM-DD" from a Date, in LOCAL time (not toISOString, which is UTC). */
export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Parses a "YYYY-MM-DD" key as local midnight — never UTC. */
export function fromDateKey(key: string): Date {
  const parts = key.split("-").map(Number);
  const [year, month, day] = parts;
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function addDays(key: string, days: number): string {
  const date = fromDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

export function addMonths(key: string, months: number): string {
  const date = fromDateKey(key);
  date.setMonth(date.getMonth() + months, 1);
  return toDateKey(date);
}

/** True if `key` falls within [startKey, endKey] inclusive — plain
 * string comparison is valid since these are zero-padded ISO dates. */
export function isWithinRange(key: string, startKey: string, endKey: string): boolean {
  return key >= startKey && key <= endKey;
}

export interface MonthGrid {
  /** Weeks of 7 date keys each, always full weeks (leading/trailing
   * days from adjacent months included so the grid is rectangular). */
  weeks: string[][];
  /** The year/month this grid was generated for, for "is outside month" checks. */
  year: number;
  month: number; // 0-indexed, matches Date.getMonth()
}

/** Generates a 6-week-max rectangular month grid, weeks starting Sunday. */
export function getMonthGrid(year: number, month: number): MonthGrid {
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay(); // 0 = Sunday
  const gridStart = new Date(year, month, 1 - startOffset);

  const lastOfMonth = new Date(year, month + 1, 0);
  const endOffset = 6 - lastOfMonth.getDay();
  const gridEnd = new Date(year, month + 1, lastOfMonth.getDate() + endOffset);

  const totalDays = Math.round((gridEnd.getTime() - gridStart.getTime()) / 86_400_000) + 1;
  const days: string[] = [];
  for (let i = 0; i < totalDays; i += 1) {
    days.push(toDateKey(new Date(year, month, 1 - startOffset + i)));
  }

  const weeks: string[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return { weeks, year, month };
}

/** The 7 date keys (Sunday-Saturday) for the week containing `anchorKey`. */
export function getWeekDates(anchorKey: string): string[] {
  const anchor = fromDateKey(anchorKey);
  const startOffset = anchor.getDay();
  const weekStart = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - startOffset);
  return Array.from({ length: 7 }, (_, i) => toDateKey(new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i)));
}

export function isSameMonth(key: string, year: number, month: number): boolean {
  const d = fromDateKey(key);
  return d.getFullYear() === year && d.getMonth() === month;
}

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
