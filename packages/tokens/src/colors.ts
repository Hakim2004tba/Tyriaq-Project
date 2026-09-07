/**
 * Tyriaq color tokens — the single source of truth.
 *
 * Tyriaq is a DARK-FIRST product. There is one theme, and it is dark:
 * `:root` carries the dark values, and light is not a supported mode
 * today. That is a product decision, not an oversight — the whole visual
 * language (aurora bleed, edge-lit elevation, violet glow) only reads
 * correctly on a near-black cosmic ground.
 *
 * Structure:
 *  1. Primitive scales (violet / ink / signal) — never referenced
 *     directly from product UI.
 *  2. Semantic tokens — always use these in components.
 *
 * The violet is deliberately saturated, not the desaturated indigo of a
 * "calm" enterprise tool: Tyriaq's identity is a lit violet against deep
 * space. Restraint comes from *how little surface area* the accent
 * covers, not from dulling the hue.
 */

/** Brand violet. 500 is the accent; buttons use the 500→700 gradient so
 * white label text clears 4.5:1 (flat 500 under white is only ~3.5:1). */
export const violet = {
  50: "#F3EFFF",
  100: "#E7DEFF",
  200: "#CFBEFF",
  300: "#B39CFC",
  400: "#A78BFA",
  500: "#8B5CF6",
  600: "#7C3AED",
  700: "#6D28D9",
  800: "#5B21B6",
  900: "#431C8F",
  950: "#2A1160",
} as const;

/**
 * Ink — a cool near-black carrying a faint navy/violet cast rather than
 * a neutral grey. On a pure-grey ramp the violet accent reads as a
 * sticker sitting on top of the UI; on this ramp it reads as part of it.
 */
export const ink = {
  0: "#FFFFFF",
  50: "#F4F1FD",
  100: "#E4DFF3",
  200: "#C6BFDF",
  300: "#A8A0C4",
  400: "#7C7499",
  500: "#635B80",
  600: "#4A4364",
  700: "#332E48",
  800: "#221E33",
  900: "#171327",
  925: "#130E24",
  950: "#0C0819",
  975: "#0A0616",
  1000: "#07040F",
} as const;

/**
 * Signal colors — status, priority and analytics only. Tuned for a dark
 * ground (a raw Tailwind red vibrates against near-black). These are the
 * *only* non-violet hues allowed in product chrome.
 */
export const signal = {
  success: "#34D399",
  warning: "#FBBF24",
  danger: "#FB7185",
  info: "#60A5FA",
} as const;

/** Analytics series — violet-led, so charts stay on-brand. Ordered by
 * assignment priority; only reach past index 3 for real multi-series data. */
export const chartSeries = [
  "#8B5CF6",
  "#C084FC",
  "#60A5FA",
  "#34D399",
  "#FBBF24",
  "#FB7185",
  "#2DD4BF",
  "#A78BFA",
] as const;

/** Alpha helpers — tints read as glass on a dark ground where a solid
 * mix would read as a flat, slightly-off panel. */
const alpha = {
  white06: "rgba(255, 255, 255, 0.06)",
  white08: "rgba(255, 255, 255, 0.08)",
  white12: "rgba(255, 255, 255, 0.12)",
  violet12: "rgba(139, 92, 246, 0.12)",
  violet18: "rgba(139, 92, 246, 0.18)",
  violet28: "rgba(139, 92, 246, 0.28)",
} as const;

/**
 * Semantic tokens. These names are the contract every component codes
 * against — `bg-surface`, `text-text-secondary`, `border-border`.
 * Materialized as CSS custom properties in apps/web/app/globals.css.
 */
export const semantic = {
  // Brand
  primary: violet[500],
  primaryForeground: ink[0],
  primaryHover: violet[400],
  primaryActive: violet[600],
  primarySubtle: alpha.violet12,
  primaryMuted: alpha.violet18,

  // Surfaces — five steps, each one a real elevation level. Nothing in
  // the product should invent a sixth.
  background: ink[950], // the canvas
  surface: ink[925], // cards, panels
  surfaceElevated: "#1A1330", // popovers, dropdowns, modals
  surfaceMuted: "#100B20", // recessed wells, table headers
  surfaceGlass: "rgba(26, 19, 48, 0.72)", // over the aurora, needs backdrop-blur

  // Borders — hairlines, never a visible frame.
  border: alpha.white08,
  borderStrong: alpha.white12,
  borderBrand: alpha.violet28,

  // Text
  textPrimary: ink[50],
  textSecondary: ink[300],
  textMuted: ink[400],
  textOnPrimary: ink[0],

  // Signal
  success: signal.success,
  successSubtle: "rgba(52, 211, 153, 0.12)",
  warning: signal.warning,
  warningSubtle: "rgba(251, 191, 36, 0.12)",
  danger: signal.danger,
  dangerSubtle: "rgba(251, 113, 133, 0.12)",
  info: signal.info,
  infoSubtle: "rgba(96, 165, 250, 0.12)",
} as const;

/**
 * Sidebar chrome — one step darker than the canvas so the rail reads as
 * chrome rather than as another panel. Kept as its own palette (not
 * derived) because the shell is the most brand-forward surface and gets
 * tuned independently of content.
 */
export const sidebarColors = {
  bg: ink[975],
  bgElevated: "#120C24",
  border: "rgba(255, 255, 255, 0.06)",
  text: ink[50],
  textMuted: ink[400],
  hover: "rgba(255, 255, 255, 0.05)",
  activeBg: alpha.violet18,
  activeText: ink[0],
  ring: "rgba(139, 92, 246, 0.55)",
} as const;

/**
 * Gradients. Two, and only two, in the whole product:
 *  - `brand` for primary actions and brand marks
 *  - `aurora` for the single canvas-level violet bleed
 * Anything else gets a flat surface.
 */
export const gradients = {
  brand: `linear-gradient(135deg, ${violet[500]} 0%, ${violet[700]} 100%)`,
  brandHover: `linear-gradient(135deg, ${violet[400]} 0%, ${violet[600]} 100%)`,
  aurora:
    "radial-gradient(1100px 520px at 8% -8%, rgba(124, 58, 237, 0.20), transparent 62%), " +
    "radial-gradient(760px 420px at 92% 4%, rgba(139, 92, 246, 0.11), transparent 60%)",
  /** Only for the rationed "cosmic" surfaces — goal cards, panel headers,
   * empty states. See shadows.ts and the design-system canon for the
   * one-per-viewport rule. */
  cosmic:
    "radial-gradient(130% 100% at 100% 0%, rgba(168, 85, 247, 0.28) 0%, rgba(109, 40, 217, 0.14) 38%, transparent 70%)",
} as const;

export type SemanticColorToken = keyof typeof semantic;

/**
 * Back-compat aliases. The pre-Tyriaq token module exported
 * `semanticLight` / `semanticDark`; Tyriaq has a single dark theme.
 * Both names resolve to it so nothing importing the old API breaks.
 */
export const semanticDark = semantic;
export const semanticLight = semantic;
export const purple = violet;
export const neutral = ink;

/**
 * Back-compat: the pre-Tyriaq module exported status colors as 4-step
 * ramps. apps/mobile re-exports this shape. Kept so the mobile theme
 * layer keeps compiling until its own Tyriaq pass (Phase 13); new code
 * should use `signal` / `semantic` instead.
 */
export const statusColors = {
  success: { 50: "rgba(52, 211, 153, 0.12)", 500: signal.success, 600: "#10B981", 700: "#059669" },
  warning: { 50: "rgba(251, 191, 36, 0.12)", 500: signal.warning, 600: "#F59E0B", 700: "#D97706" },
  danger: { 50: "rgba(251, 113, 133, 0.12)", 500: signal.danger, 600: "#F43F5E", 700: "#E11D48" },
  info: { 50: "rgba(96, 165, 250, 0.12)", 500: signal.info, 600: "#3B82F6", 700: "#2563EB" },
} as const;
