/**
 * Chart colours.
 *
 * The interface's accent hues sit above the lightness band that reads
 * reliably as a filled mark on this dark surface, so the chart palette
 * steps the SAME hues darker. Identity is preserved — a violet series
 * still reads as Tyriaq violet — while the marks themselves pass the
 * checks the interface accents were never asked to pass.
 *
 * Validated against surface #130E24 in dark mode:
 *   lightness band  PASS (all six inside L 0.48–0.67)
 *   chroma floor    PASS
 *   CVD separation  PASS (worst adjacent ΔE 16.7, deuteranopia)
 *   normal vision   PASS (worst adjacent ΔE 32.7)
 *   contrast        PASS (all ≥ 3:1)
 *
 * The ORDER is part of the result: it is the ordering that maximises the
 * worst adjacent pair, so neighbouring series stay distinguishable. Hues
 * are assigned in this order and never cycled — a seventh series folds
 * into "Other" rather than reusing slot one.
 */
export const CATEGORICAL = [
  "#0891B2", // cyan
  "#E11D48", // rose
  "#2563EB", // blue
  "#D97706", // amber
  "#7C3AED", // violet — the interface's own primary, one step darker
  "#059669", // emerald
] as const;

export const OTHER = "#5B5570";

export function categorical(index: number): string {
  return CATEGORICAL[index] ?? OTHER;
}

/**
 * Status colours are RESERVED — they mean a state, not a series, and are
 * never handed out as "the fourth colour". These are the same states the
 * board and the task list use, so a donut of statuses reads with the
 * same vocabulary as the columns it summarises.
 */
export const STATUS_COLOR: Record<string, string> = {
  todo: "#6B6480",
  in_progress: "#7C3AED",
  review: "#D97706",
  done: "#059669",
  blocked: "#E11D48",
};

export const PRIORITY_COLOR: Record<string, string> = {
  urgent: "#E11D48",
  high: "#D97706",
  medium: "#2563EB",
  low: "#059669",
};
