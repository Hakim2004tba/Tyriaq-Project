import * as React from "react";
import { cn } from "@flow/utils";

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0));
}

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 0–100. Values outside the range are clamped rather than overflowing
   * the track — progress data from aggregates is not always trustworthy. */
  value: number;
  size?: "sm" | "md";
  tone?: "brand" | "success" | "warning" | "danger" | "neutral";
  label?: string;
  /** Renders the percentage to the right of the track. */
  showValue?: boolean;
}

const FILL: Record<NonNullable<ProgressProps["tone"]>, string> = {
  brand: "bg-brand",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  neutral: "bg-text-muted",
};

/**
 * Linear progress. The track is a recessed well (darker than its
 * surface) and the fill carries the brand gradient — so a progress bar
 * is one of the few places violet occupies real estate, which is why the
 * track is kept thin.
 */
export function Progress({
  value,
  size = "md",
  tone = "brand",
  label,
  showValue = false,
  className,
  ...props
}: ProgressProps) {
  const pct = clamp(value);
  return (
    <div className={cn("flex items-center gap-3", className)} {...props}>
      <div
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className={cn(
          "w-full overflow-hidden rounded-full bg-surface-muted ring-1 ring-inset ring-white/5",
          size === "sm" ? "h-1" : "h-1.5"
        )}
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-slow ease-emphasized", FILL[tone])}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showValue && (
        <span className="shrink-0 text-caption tabular text-text-secondary">{Math.round(pct)}%</span>
      )}
    </div>
  );
}

export interface ProgressRingProps extends React.SVGAttributes<SVGSVGElement> {
  value: number;
  size?: number;
  strokeWidth?: number;
  tone?: NonNullable<ProgressProps["tone"]>;
  label?: string;
  /** Renders the percentage in the middle of the ring. */
  showValue?: boolean;
}

const STROKE: Record<NonNullable<ProgressProps["tone"]>, string> = {
  brand: "rgb(var(--color-primary))",
  success: "rgb(var(--color-success))",
  warning: "rgb(var(--color-warning))",
  danger: "rgb(var(--color-danger))",
  neutral: "rgb(var(--color-text-muted))",
};

/**
 * Radial progress, for compact readouts where a bar would be too wide —
 * project completion in a card corner, a goal's rollup in a list row.
 */
export function ProgressRing({
  value,
  size = 40,
  strokeWidth = 3,
  tone = "brand",
  label,
  showValue = true,
  className,
  ...props
}: ProgressRingProps) {
  const pct = clamp(value);
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  return (
    <span className={cn("relative inline-flex shrink-0", className)} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        // -90deg so the arc starts at 12 o'clock rather than 3 o'clock.
        className="-rotate-90"
        {...props}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgb(var(--color-surface-muted))"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={STROKE[tone]}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (pct / 100) * circumference}
          className="transition-[stroke-dashoffset] duration-slow ease-emphasized"
        />
      </svg>
      {showValue && (
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold tabular text-text-primary">
          {Math.round(pct)}
        </span>
      )}
    </span>
  );
}
