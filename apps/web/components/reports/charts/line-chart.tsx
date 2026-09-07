"use client";

import { useMemo, useRef, useState } from "react";
import { cn } from "@flow/utils";

export interface LineSeries {
  key: string;
  label: string;
  color: string;
  values: number[];
}

/**
 * Change over time.
 *
 * One shared y-scale for every series — never two axes. Two measures of
 * different magnitude belong in two charts; a second scale lets a
 * designer make any pair of lines cross wherever they like.
 *
 * The crosshair reads the nearest x from the pointer's position rather
 * than from hit areas on the points, so the value appears anywhere along
 * the plot instead of only within a few pixels of a marker.
 */
export function LineChart({
  labels,
  series,
  height = 200,
  formatValue = (n: number) => String(n),
}: {
  labels: string[];
  series: LineSeries[];
  height?: number;
  formatValue?: (n: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const width = 640;
  const padding = { top: 12, right: 12, bottom: 22, left: 34 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const max = useMemo(() => {
    const highest = Math.max(1, ...series.flatMap((s) => s.values));
    // Round up to something a person would choose, so gridlines land on
    // whole numbers rather than 6.4 and 12.8.
    const step = Math.pow(10, Math.floor(Math.log10(highest)));
    return Math.ceil(highest / step) * step;
  }, [series]);

  const count = labels.length;
  const x = (i: number) => padding.left + (count <= 1 ? plotWidth / 2 : (i / (count - 1)) * plotWidth);
  const y = (value: number) => padding.top + plotHeight - (value / max) * plotHeight;

  const ticks = [0, max / 2, max];

  function onMove(event: React.PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg || count === 0) return;
    const rect = svg.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    const position = ratio * width - padding.left;
    const index = Math.round((position / plotWidth) * (count - 1));
    setHover(Math.min(count - 1, Math.max(0, index)));
  }

  return (
    <div className="relative min-w-0">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full touch-none"
        role="img"
        aria-label={`${series.map((s) => s.label).join(" and ")} over time`}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={y(tick)}
              y2={y(tick)}
              stroke="rgb(var(--color-text-muted) / 0.18)"
              strokeWidth="1"
            />
            <text
              x={padding.left - 6}
              y={y(tick) + 3}
              textAnchor="end"
              className="fill-[rgb(var(--color-text-muted))] text-[9px] tabular-nums"
            >
              {Math.round(tick)}
            </text>
          </g>
        ))}

        {hover !== null && (
          <line
            x1={x(hover)}
            x2={x(hover)}
            y1={padding.top}
            y2={padding.top + plotHeight}
            stroke="rgb(var(--color-text-muted) / 0.5)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        )}

        {series.map((line) => {
          const path = line.values
            .map((value, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(value)}`)
            .join(" ");
          return (
            <g key={line.key}>
              <path d={path} fill="none" stroke={line.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              {hover !== null && line.values[hover] !== undefined && (
                <circle
                  cx={x(hover)}
                  cy={y(line.values[hover]!)}
                  r="4.5"
                  fill={line.color}
                  /* A ring in the surface colour keeps two markers
                     readable where the lines cross. */
                  stroke="rgb(var(--color-surface))"
                  strokeWidth="2"
                />
              )}
            </g>
          );
        })}

        {labels.map((label, i) => {
          // Only a few dates are labelled; one per day turns the axis
          // into a smear at any useful range.
          const stride = Math.max(1, Math.ceil(count / 6));
          if (i % stride !== 0 && i !== count - 1) return null;
          return (
            <text
              key={label}
              x={x(i)}
              y={height - 6}
              textAnchor={i === 0 ? "start" : i === count - 1 ? "end" : "middle"}
              className="fill-[rgb(var(--color-text-muted))] text-[9px] tabular-nums"
            >
              {label.slice(5)}
            </text>
          );
        })}
      </svg>

      {hover !== null && labels[hover] && (
        <div
          className={cn(
            "pointer-events-none absolute top-2 z-10 min-w-[8rem] rounded-md border border-border",
            "bg-surface-elevated px-2.5 py-1.5 shadow-lg"
          )}
          style={{
            left: `${(x(hover) / width) * 100}%`,
            transform: hover > count / 2 ? "translateX(calc(-100% - 8px))" : "translateX(8px)",
          }}
        >
          <p className="text-caption tabular text-text-muted">{labels[hover]}</p>
          <ul className="mt-1 flex flex-col gap-0.5">
            {series.map((line) => (
              <li key={line.key} className="flex items-center gap-1.5 text-caption">
                <span
                  className="size-2 shrink-0 rounded-[2px]"
                  style={{ background: line.color }}
                  aria-hidden="true"
                />
                <span className="text-text-secondary">{line.label}</span>
                <span className="ml-auto tabular text-text-primary">
                  {formatValue(line.values[hover] ?? 0)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
