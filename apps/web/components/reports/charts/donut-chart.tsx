"use client";

import { useState } from "react";

export interface Slice {
  key: string;
  label: string;
  value: number;
  color: string;
}

/**
 * Parts of one whole.
 *
 * A donut rather than a pie so the middle can carry the total — the
 * number people actually came for — and because comparing arc lengths
 * around a ring is easier than comparing wedge areas.
 *
 * Segments are separated by a 2px gap in the surface colour, which is
 * what keeps two adjacent slices legible when their hues are close.
 */
export function DonutChart({
  slices,
  centerLabel,
  centerValue,
  size = 168,
}: {
  slices: Slice[];
  centerLabel: string;
  centerValue: string;
  size?: number;
}) {
  const [hover, setHover] = useState<string | null>(null);

  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const stroke = 22;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  if (total === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-4">
        <div
          className="rounded-full border-[22px] border-white/[0.05]"
          style={{ width: size, height: size }}
          aria-hidden="true"
        />
        <p className="text-body-sm text-text-muted">No tasks in this range.</p>
      </div>
    );
  }

  let offset = 0;

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
          role="img"
          aria-label={slices.map((s) => `${s.label}: ${s.value}`).join(", ")}
        >
          {slices.map((slice) => {
            if (slice.value === 0) return null;
            const fraction = slice.value / total;
            const length = fraction * circumference;
            // A 2px gap between segments, taken off the end of each arc.
            const dash = Math.max(0, length - 2);
            const element = (
              <circle
                key={slice.key}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth={hover === slice.key ? stroke + 4 : stroke}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                className="transition-[stroke-width] duration-fast"
                onPointerEnter={() => setHover(slice.key)}
                onPointerLeave={() => setHover(null)}
              />
            );
            offset += length;
            return element;
          })}
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          {hover ? (
            <>
              <span className="text-h3 tabular text-text-primary">
                {slices.find((s) => s.key === hover)?.value ?? 0}
              </span>
              <span className="max-w-[6rem] truncate text-caption text-text-muted">
                {slices.find((s) => s.key === hover)?.label}
              </span>
            </>
          ) : (
            <>
              <span className="text-h3 tabular text-text-primary">{centerValue}</span>
              <span className="text-caption text-text-muted">{centerLabel}</span>
            </>
          )}
        </div>
      </div>

      {/* Direct labels beside the ring: with five or fewer slices these
          replace hunting between a legend and an arc. */}
      <ul className="flex min-w-0 flex-col gap-1.5">
        {slices.map((slice) => (
          <li
            key={slice.key}
            className="flex items-center gap-2 text-caption"
            onPointerEnter={() => setHover(slice.key)}
            onPointerLeave={() => setHover(null)}
          >
            <span
              className="size-2.5 shrink-0 rounded-[3px]"
              style={{ background: slice.color }}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate text-text-secondary">{slice.label}</span>
            <span className="shrink-0 tabular text-text-primary">{slice.value}</span>
            <span className="w-9 shrink-0 text-right tabular text-text-muted">
              {Math.round((slice.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
