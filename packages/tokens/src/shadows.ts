/**
 * Elevation, glow and the edge-lit rim.
 *
 * On a near-black ground, a conventional drop shadow is invisible — you
 * cannot cast a darker shadow onto something already almost black. So
 * Tyriaq's depth comes from three stacked ideas:
 *
 *  1. `shadow` — a wide, very dark ambient pool that separates a surface
 *     from the canvas by *occluding the aurora behind it*.
 *  2. `rim` — a 1px inset highlight on the top edge. This is what
 *     actually reads as "raised": the surface catches light on its lip.
 *     Panels stay dark; only their edge brightens.
 *  3. `glow` — violet light spill. This is a STATE, not decoration:
 *     primary actions, the active nav item, focus, and drag targets.
 *     Nothing idle should glow.
 */

export const shadow = {
  none: "none",
  xs: "0 1px 2px 0 rgba(0, 0, 0, 0.40)",
  sm: "0 2px 6px -1px rgba(0, 0, 0, 0.45)",
  md: "0 8px 24px -8px rgba(0, 0, 0, 0.60)",
  lg: "0 20px 48px -12px rgba(0, 0, 0, 0.70)",
  xl: "0 32px 80px -20px rgba(0, 0, 0, 0.80)",
} as const;

/** The edge-lit rim. Compose onto a surface, never used alone. */
export const rim = {
  DEFAULT: "inset 0 1px 0 0 rgba(255, 255, 255, 0.05)",
  strong: "inset 0 1px 0 0 rgba(255, 255, 255, 0.09)",
} as const;

/** Violet light spill. Reserved for interactive state — see the note above. */
export const glow = {
  none: "none",
  sm: "0 0 0 1px rgba(139, 92, 246, 0.18), 0 4px 14px -4px rgba(124, 58, 237, 0.45)",
  md: "0 0 0 1px rgba(139, 92, 246, 0.24), 0 8px 28px -8px rgba(124, 58, 237, 0.55)",
  lg: "0 0 0 1px rgba(139, 92, 246, 0.30), 0 16px 48px -12px rgba(124, 58, 237, 0.60)",
  /** Focus ring — the one glow that may appear on any element. */
  focus: "0 0 0 2px rgba(139, 92, 246, 0.55), 0 0 0 4px rgba(139, 92, 246, 0.14)",
} as const;

export type ShadowToken = keyof typeof shadow;
export type GlowToken = keyof typeof glow;
