/**
 * @flow/tokens — the single canonical source of Tyriaq's design tokens.
 *
 * This package is platform-agnostic: pure TypeScript, zero React/DOM
 * dependencies. Both apps/web (via @flow/ui + CSS variables) and
 * apps/mobile (via a thin React Native transform layer) derive their
 * values from here. Nothing outside this package should hardcode a
 * brand color, spacing number, or type size — it should import it.
 */
export * from "./colors";
export * from "./typography";
export * from "./spacing";
export * from "./radius";
export * from "./shadows";
export * from "./breakpoints";
export * from "./motion";
