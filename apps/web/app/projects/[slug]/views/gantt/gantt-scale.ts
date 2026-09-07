import { dateFromOffset } from "@/lib/data/task-types";
import { MONTH_SHORT, WEEKDAY_MIN } from "@/components/calendar/calendar-dates";

/**
 * The Gantt's x-axis.
 *
 * Every coordinate on the chart — bars, gridlines, the today marker,
 * dependency arrows — is derived from `(offset - min) * dayWidth`. One
 * formula, so the four layers cannot drift apart by a pixel the way four
 * independent grid placements would.
 */

export type Zoom = "day" | "week" | "month";

export const ZOOM_LEVELS: { id: Zoom; label: string; dayWidth: number }[] = [
  { id: "day", label: "Days", dayWidth: 30 },
  { id: "week", label: "Weeks", dayWidth: 11 },
  { id: "month", label: "Months", dayWidth: 3.6 },
];

export const ZOOM_WIDTH: Record<Zoom, number> = {
  day: 30,
  week: 11,
  month: 3.6,
};

/** Minimum bar width so a one-day task stays clickable when zoomed out. */
export const MIN_BAR = 8;

export interface Band {
  key: string;
  label: string;
  /** Day index from the scale's start. */
  start: number;
  span: number;
}

export interface Scale {
  min: number;
  max: number;
  days: number;
  dayWidth: number;
  width: number;
  /** Coarse header row — months, or years at month zoom. */
  primary: Band[];
  /** Fine header row — days, week-starts, or months. */
  secondary: Band[];
  /** Where vertical gridlines fall, as day indices. */
  gridEvery: number;
  x: (offset: number) => number;
  /** Day offset for a pixel position, rounded to a whole day. */
  offsetAt: (px: number) => number;
}

export function buildScale(minOffset: number, maxOffset: number, zoom: Zoom): Scale {
  const dayWidth = ZOOM_WIDTH[zoom];
  const min = minOffset;
  const max = maxOffset;
  const days = Math.max(1, max - min + 1);
  const width = days * dayWidth;

  const primary: Band[] = [];
  const secondary: Band[] = [];

  const push = (list: Band[], label: string, start: number, key: string) => {
    const last = list[list.length - 1];
    if (last && last.key === key) last.span += 1;
    else list.push({ key, label, start, span: 1 });
  };

  for (let i = 0; i < days; i++) {
    const d = dateFromOffset(min + i);
    if (zoom === "month") {
      push(primary, String(d.getFullYear()), i, `y${d.getFullYear()}`);
      push(secondary, MONTH_SHORT[d.getMonth()]!, i, `m${d.getFullYear()}-${d.getMonth()}`);
    } else {
      push(primary, `${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`, i, `m${d.getFullYear()}-${d.getMonth()}`);
      if (zoom === "day") {
        push(secondary, String(d.getDate()), i, `d${i}`);
      } else {
        // Week zoom: one cell per Monday-started week, labelled by its
        // first date — a per-day label would be unreadable at 11px.
        const monday = new Date(d);
        monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
        push(
          secondary,
          `${monday.getDate()} ${MONTH_SHORT[monday.getMonth()]}`,
          i,
          `w${monday.getFullYear()}-${monday.getMonth()}-${monday.getDate()}`
        );
      }
    }
  }

  return {
    min,
    max,
    days,
    dayWidth,
    width,
    primary,
    secondary,
    gridEvery: zoom === "day" ? 1 : zoom === "week" ? 7 : 30,
    x: (offset: number) => (offset - min) * dayWidth,
    offsetAt: (px: number) => Math.round(px / dayWidth) + min,
  };
}

/** Whether a day index in the scale falls on a weekend. */
export function isWeekendDay(scale: Scale, dayIndex: number): boolean {
  const d = dateFromOffset(scale.min + dayIndex);
  return d.getDay() === 0 || d.getDay() === 6;
}

export function dayLabel(offset: number): string {
  const d = dateFromOffset(offset);
  return `${WEEKDAY_MIN[(d.getDay() + 6) % 7]} ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
}
