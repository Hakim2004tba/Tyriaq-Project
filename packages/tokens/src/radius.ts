/**
 * Corner radius. Tyriaq's geometry is soft but not pill-shaped:
 * chips are rounder than cards, cards are rounder than inputs, and
 * nothing in the product is square. Five steps plus `full` — if a new
 * value seems necessary, one of these is being used in the wrong place.
 */
export const radius = {
  none: "0px",
  sm: "8px", // chips, small tags, checkboxes
  md: "10px", // buttons, inputs, menu items
  lg: "14px", // cards, list rows
  xl: "18px", // panels, modals, large containers
  "2xl": "24px", // hero / cosmic surfaces
  full: "9999px", // pills, avatars, progress tracks
} as const;

export type RadiusToken = keyof typeof radius;
