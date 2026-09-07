/**
 * Typography.
 *
 * One family — Inter — carrying both roles. The display sizes are
 * separated from body not by a second typeface but by weight and
 * negative tracking: at 32px+ Inter needs to be pulled tight or it
 * reads loose and generic. That tightening is what makes the large
 * headings feel engineered rather than default.
 *
 * Numerals are tabular everywhere a value can change (metrics, counts,
 * durations, dates) so figures don't jitter as they update — see the
 * `.tabular` utility in globals.css.
 */

export const fontFamily = {
  sans: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  /** Display and body are the same family today. Kept as a distinct
   * token so a dedicated display face can be swapped in at the type
   * layer without touching a single component. */
  display: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  mono: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace",
} as const;

export const fontWeight = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
} as const;

// size / lineHeight / letterSpacing / weight
export const typeScale = {
  displayLg: { size: "60px", lineHeight: "64px", letterSpacing: "-0.035em", weight: fontWeight.bold },
  display: { size: "44px", lineHeight: "50px", letterSpacing: "-0.03em", weight: fontWeight.bold },
  h1: { size: "32px", lineHeight: "40px", letterSpacing: "-0.025em", weight: fontWeight.semibold },
  h2: { size: "24px", lineHeight: "32px", letterSpacing: "-0.02em", weight: fontWeight.semibold },
  h3: { size: "19px", lineHeight: "26px", letterSpacing: "-0.015em", weight: fontWeight.semibold },
  h4: { size: "16px", lineHeight: "24px", letterSpacing: "-0.01em", weight: fontWeight.semibold },
  bodyLarge: { size: "16px", lineHeight: "26px", letterSpacing: "-0.005em", weight: fontWeight.regular },
  body: { size: "14px", lineHeight: "21px", letterSpacing: "0em", weight: fontWeight.regular },
  bodySmall: { size: "13px", lineHeight: "19px", letterSpacing: "0em", weight: fontWeight.regular },
  caption: { size: "12px", lineHeight: "16px", letterSpacing: "0.005em", weight: fontWeight.regular },
  label: { size: "13px", lineHeight: "16px", letterSpacing: "0em", weight: fontWeight.medium },
  /** Section eyebrows — "SPACES", "RECENT". Always uppercase, always muted. */
  overline: { size: "11px", lineHeight: "14px", letterSpacing: "0.09em", weight: fontWeight.semibold },
  /** Metric readouts — the big numbers on stat cards. Tabular by default. */
  metric: { size: "30px", lineHeight: "36px", letterSpacing: "-0.03em", weight: fontWeight.semibold },
} as const;

export type TypeScaleToken = keyof typeof typeScale;
