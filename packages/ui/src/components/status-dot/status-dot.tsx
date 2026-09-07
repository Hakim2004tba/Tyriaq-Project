import * as React from "react";
import { cn } from "@flow/utils";

export type StatusTone = "todo" | "in_progress" | "review" | "done" | "blocked";

const TONE: Record<StatusTone, { dot: string; ring: string; label: string }> = {
  todo: { dot: "bg-text-muted", ring: "bg-text-muted/25", label: "To do" },
  in_progress: { dot: "bg-primary", ring: "bg-primary/25", label: "In progress" },
  review: { dot: "bg-warning", ring: "bg-warning/25", label: "In review" },
  done: { dot: "bg-success", ring: "bg-success/25", label: "Done" },
  blocked: { dot: "bg-danger", ring: "bg-danger/25", label: "Blocked" },
};

export interface StatusDotProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone: StatusTone;
  /** Renders the halo ring. Reserve for the *current* status in a group
   * — a board full of haloed dots is noise. */
  emphasis?: boolean;
  /** Omit to render the dot alone (e.g. inside a dense table row). */
  showLabel?: boolean;
  label?: string;
}

/**
 * The atomic status indicator: a dot, optionally haloed, optionally
 * labelled. Column headers, task rows and the detail panel all use this
 * one component so a status reads identically everywhere.
 *
 * Colour is never the only carrier — a label or an `aria-label` always
 * accompanies it, so status survives a colour-vision deficiency.
 */
export function StatusDot({
  tone,
  emphasis = false,
  showLabel = false,
  label,
  className,
  ...props
}: StatusDotProps) {
  const t = TONE[tone];
  const text = label ?? t.label;
  return (
    <span className={cn("inline-flex items-center gap-2", className)} {...props}>
      <span className="relative flex size-2 shrink-0 items-center justify-center">
        {emphasis && <span className={cn("absolute size-3.5 rounded-full", t.ring)} aria-hidden="true" />}
        <span className={cn("size-2 rounded-full", t.dot)} aria-hidden="true" />
      </span>
      {showLabel ? (
        <span className="text-body-sm font-medium text-text-primary">{text}</span>
      ) : (
        <span className="sr-only">{text}</span>
      )}
    </span>
  );
}
