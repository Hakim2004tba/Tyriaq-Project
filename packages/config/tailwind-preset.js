/**
 * Tyriaq's Design System bridge into Tailwind.
 *
 * Canonical values live in packages/tokens (pure TypeScript, shared with
 * apps/mobile). CSS cannot import a TS module at build time, so colors
 * are materialized as CSS custom properties in apps/web/app/globals.css
 * and referenced here via var(...). The non-color scales are mirrored
 * from packages/tokens/src because Tailwind's config loader runs in
 * plain Node. If a value changes in packages/tokens, update it here and
 * in globals.css.
 *
 * Components use the semantic class names (bg-surface, text-text-primary,
 * border-border, shadow-glow-md) — never raw Tailwind color utilities and
 * never an arbitrary hex.
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        // Solid tokens are stored as RGB CHANNELS in globals.css and composed
        // here with <alpha-value>, which is what makes opacity modifiers
        // (`bg-surface/80`, `bg-primary/25`) work. Tokens that are inherently
        // translucent — borders, tints, glass — carry their own alpha and are
        // passed through untouched; do not put a modifier on those.
        primary: {
          DEFAULT: "rgb(var(--color-primary) / <alpha-value>)",
          foreground: "rgb(var(--color-primary-foreground) / <alpha-value>)",
          hover: "rgb(var(--color-primary-hover) / <alpha-value>)",
          active: "rgb(var(--color-primary-active) / <alpha-value>)",
          subtle: "var(--color-primary-subtle)",
          muted: "var(--color-primary-muted)",
        },
        background: "rgb(var(--color-background) / <alpha-value>)",
        surface: {
          DEFAULT: "rgb(var(--color-surface) / <alpha-value>)",
          elevated: "rgb(var(--color-surface-elevated) / <alpha-value>)",
          muted: "rgb(var(--color-surface-muted) / <alpha-value>)",
          glass: "var(--color-surface-glass)",
        },
        border: {
          DEFAULT: "var(--color-border)",
          strong: "var(--color-border-strong)",
          brand: "var(--color-border-brand)",
        },
        text: {
          primary: "rgb(var(--color-text-primary) / <alpha-value>)",
          secondary: "rgb(var(--color-text-secondary) / <alpha-value>)",
          muted: "rgb(var(--color-text-muted) / <alpha-value>)",
          "on-primary": "rgb(var(--color-text-on-primary) / <alpha-value>)",
        },
        success: {
          DEFAULT: "rgb(var(--color-success) / <alpha-value>)",
          subtle: "var(--color-success-subtle)",
        },
        warning: {
          DEFAULT: "rgb(var(--color-warning) / <alpha-value>)",
          subtle: "var(--color-warning-subtle)",
        },
        danger: {
          DEFAULT: "rgb(var(--color-danger) / <alpha-value>)",
          subtle: "var(--color-danger-subtle)",
        },
        info: {
          DEFAULT: "rgb(var(--color-info) / <alpha-value>)",
          subtle: "var(--color-info-subtle)",
        },
        sidebar: {
          DEFAULT: "rgb(var(--color-sidebar-bg) / <alpha-value>)",
          elevated: "rgb(var(--color-sidebar-bg-elevated) / <alpha-value>)",
          border: "var(--color-sidebar-border)",
          text: "rgb(var(--color-sidebar-text) / <alpha-value>)",
          "text-muted": "rgb(var(--color-sidebar-text-muted) / <alpha-value>)",
          hover: "var(--color-sidebar-hover)",
          "active-bg": "var(--color-sidebar-active-bg)",
          "active-text": "rgb(var(--color-sidebar-active-text) / <alpha-value>)",
          ring: "var(--color-sidebar-ring)",
        },
      },
      backgroundImage: {
        // The only two gradients in the product. See tokens/src/colors.ts.
        brand: "var(--gradient-brand)",
        "brand-hover": "var(--gradient-brand-hover)",
        aurora: "var(--gradient-aurora)",
        cosmic: "var(--gradient-cosmic)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "sans-serif"],
        display: ["var(--font-display)", "Inter", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      fontSize: {
        "display-lg": ["60px", { lineHeight: "64px", letterSpacing: "-0.035em", fontWeight: "700" }],
        display: ["44px", { lineHeight: "50px", letterSpacing: "-0.03em", fontWeight: "700" }],
        h1: ["32px", { lineHeight: "40px", letterSpacing: "-0.025em", fontWeight: "600" }],
        h2: ["24px", { lineHeight: "32px", letterSpacing: "-0.02em", fontWeight: "600" }],
        h3: ["19px", { lineHeight: "26px", letterSpacing: "-0.015em", fontWeight: "600" }],
        h4: ["16px", { lineHeight: "24px", letterSpacing: "-0.01em", fontWeight: "600" }],
        metric: ["30px", { lineHeight: "36px", letterSpacing: "-0.03em", fontWeight: "600" }],
        "body-lg": ["16px", { lineHeight: "26px", letterSpacing: "-0.005em" }],
        body: ["14px", { lineHeight: "21px" }],
        "body-sm": ["13px", { lineHeight: "19px" }],
        caption: ["12px", { lineHeight: "16px", letterSpacing: "0.005em" }],
        label: ["13px", { lineHeight: "16px", fontWeight: "500" }],
        overline: ["11px", { lineHeight: "14px", letterSpacing: "0.09em", fontWeight: "600" }],
      },
      spacing: {
        1: "4px",
        2: "8px",
        3: "12px",
        4: "16px",
        5: "20px",
        6: "24px",
        8: "32px",
        10: "40px",
        12: "48px",
        16: "64px",
        20: "80px",
        24: "96px",
        // Shell geometry — one place, so every future page agrees.
        sidebar: "264px",
        "sidebar-rail": "72px",
        topbar: "60px",
        panel: "384px",
      },
      borderRadius: {
        sm: "8px",
        md: "10px",
        lg: "14px",
        xl: "18px",
        "2xl": "24px",
      },
      boxShadow: {
        // Ambient occlusion — separates a surface from the aurora behind it.
        xs: "0 1px 2px 0 rgba(0, 0, 0, 0.40)",
        sm: "0 2px 6px -1px rgba(0, 0, 0, 0.45)",
        md: "0 8px 24px -8px rgba(0, 0, 0, 0.60)",
        lg: "0 20px 48px -12px rgba(0, 0, 0, 0.70)",
        xl: "0 32px 80px -20px rgba(0, 0, 0, 0.80)",
        // The edge-lit rim — what actually reads as "raised" on near-black.
        rim: "inset 0 1px 0 0 rgba(255, 255, 255, 0.05)",
        "rim-strong": "inset 0 1px 0 0 rgba(255, 255, 255, 0.09)",
        // Card = rim + ambient, the default composition for a surface.
        card: "inset 0 1px 0 0 rgba(255, 255, 255, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.45)",
        "card-hover":
          "inset 0 1px 0 0 rgba(255, 255, 255, 0.09), 0 8px 24px -8px rgba(0, 0, 0, 0.60)",
        // Violet spill — a STATE, never decoration.
        "glow-sm": "0 0 0 1px rgba(139, 92, 246, 0.18), 0 4px 14px -4px rgba(124, 58, 237, 0.45)",
        "glow-md": "0 0 0 1px rgba(139, 92, 246, 0.24), 0 8px 28px -8px rgba(124, 58, 237, 0.55)",
        "glow-lg": "0 0 0 1px rgba(139, 92, 246, 0.30), 0 16px 48px -12px rgba(124, 58, 237, 0.60)",
        focus: "0 0 0 2px rgba(139, 92, 246, 0.55), 0 0 0 4px rgba(139, 92, 246, 0.14)",
      },
      transitionDuration: {
        instant: "80ms",
        fast: "120ms",
        base: "180ms",
        slow: "260ms",
      },
      transitionTimingFunction: {
        emphasized: "cubic-bezier(0.32, 0.72, 0, 1)",
        exit: "cubic-bezier(0.4, 0, 1, 1)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        // Indeterminate progress only. Nothing idle shimmers.
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-up": "fade-up 180ms cubic-bezier(0.32, 0.72, 0, 1)",
        shimmer: "shimmer 1.6s infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
