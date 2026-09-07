"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@flow/utils";

/**
 * One number, large.
 *
 * Not a chart: a single figure has no shape worth plotting, and a
 * sparkline behind it usually decorates rather than informs. What it
 * does carry is the comparison — a number with nothing to measure it
 * against cannot tell you whether it is good.
 */
export function KpiCard({
  label,
  value,
  suffix,
  previous,
  invert = false,
  hint,
}: {
  label: string;
  value: number;
  suffix?: string;
  /** The same measure over the window immediately before this one. */
  previous?: number;
  /** True where DOWN is the good direction — overdue tasks, say. */
  invert?: boolean;
  hint?: string;
}) {
  const delta = previous === undefined ? null : value - previous;
  const percent =
    previous === undefined || previous === 0
      ? null
      : Math.round(((value - previous) / previous) * 100);

  const better = delta === null || delta === 0 ? null : invert ? delta < 0 : delta > 0;
  const Icon = delta === null || delta === 0 ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-lg border border-border bg-surface px-3.5 py-3 shadow-card">
      <p className="truncate text-caption text-text-muted">{label}</p>
      <p className="flex items-baseline gap-1">
        <span className="text-h2 tabular text-text-primary">{value.toLocaleString()}</span>
        {suffix && <span className="text-body-sm text-text-muted">{suffix}</span>}
      </p>

      {delta !== null ? (
        <p className="flex items-center gap-1 text-caption">
          <Icon
            className={cn(
              "size-3.5 shrink-0",
              better === null ? "text-text-muted" : better ? "text-success" : "text-danger"
            )}
            aria-hidden="true"
          />
          <span className={cn(better === null ? "text-text-muted" : better ? "text-success" : "text-danger")}>
            {percent === null ? (delta > 0 ? `+${delta}` : delta) : `${percent > 0 ? "+" : ""}${percent}%`}
          </span>
          <span className="truncate text-text-muted">vs previous period</span>
        </p>
      ) : (
        hint && <p className="truncate text-caption text-text-muted">{hint}</p>
      )}
    </div>
  );
}
