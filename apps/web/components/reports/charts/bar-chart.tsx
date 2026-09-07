"use client";

import { useState } from "react";
import { cn } from "@flow/utils";

export interface Bar {
  key: string;
  label: string;
  value: number;
  color: string;
  /** Shown under the value in the tooltip. */
  detail?: string;
}

/**
 * Magnitude across a handful of named things.
 *
 * Horizontal, because the names are people and projects — words, which
 * read along a row and get truncated or rotated on a vertical axis.
 * Bars are anchored to the baseline with rounded ends only at the data
 * end, so length stays the thing being compared.
 */
export function BarChart({
  bars,
  formatValue = (n: number) => String(n),
  emptyLabel = "Nothing to show yet.",
}: {
  bars: Bar[];
  formatValue?: (n: number) => string;
  emptyLabel?: string;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const max = Math.max(1, ...bars.map((b) => b.value));

  if (bars.length === 0) {
    return <p className="py-6 text-center text-body-sm text-text-muted">{emptyLabel}</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {bars.map((bar) => (
        <li
          key={bar.key}
          className="group relative grid grid-cols-[minmax(0,7rem)_1fr_auto] items-center gap-2.5"
          onPointerEnter={() => setHover(bar.key)}
          onPointerLeave={() => setHover(null)}
        >
          <span className="truncate text-caption text-text-secondary" title={bar.label}>
            {bar.label}
          </span>

          <span className="relative h-4 min-w-0 overflow-hidden rounded-[4px] bg-white/[0.04]">
            <span
              className="absolute inset-y-0 left-0 rounded-r-[4px] transition-[width] duration-slow"
              style={{ width: `${Math.max(2, (bar.value / max) * 100)}%`, background: bar.color }}
            />
          </span>

          <span className="shrink-0 text-caption tabular text-text-primary">
            {formatValue(bar.value)}
          </span>

          {hover === bar.key && bar.detail && (
            <span
              className={cn(
                "pointer-events-none absolute -top-1 left-[7.5rem] z-10 -translate-y-full rounded-md",
                "border border-border bg-surface-elevated px-2 py-1 text-caption text-text-secondary shadow-lg"
              )}
            >
              {bar.detail}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
