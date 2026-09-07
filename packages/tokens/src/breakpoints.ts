/**
 * Breakpoints — mobile-first. Values match Tailwind defaults for
 * predictability but are centralized here as the source of truth.
 */
export const breakpoints = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
} as const;

export type BreakpointToken = keyof typeof breakpoints;
