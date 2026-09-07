/**
 * Motion. Tyriaq animates state changes, never idle decoration — no
 * pulsing glows, no drifting gradients. Anything that moves is telling
 * the user something changed.
 */
export const duration = {
  instant: "80ms",
  fast: "120ms", // hover, color, small opacity shifts
  base: "180ms", // panels, popovers, sidebar collapse
  slow: "260ms", // modals, route-level transitions
} as const;

export const easing = {
  standard: "cubic-bezier(0.4, 0, 0.2, 1)",
  /** Tyriaq's signature curve: fast out of the gate, long settle. Use
   * for anything the user opened deliberately (panels, menus, modals). */
  emphasized: "cubic-bezier(0.32, 0.72, 0, 1)",
  exit: "cubic-bezier(0.4, 0, 1, 1)",
} as const;
