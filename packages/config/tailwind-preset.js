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
        /*
          Every shadow is a CSS variable, resolved in globals.css.

          They cannot be literals here: an ambient shadow on near-black
          is rgba(0,0,0,0.6) and on white that is a smudge, while the
          edge-lit rim — a white inset that reads as "raised" on dark —
          is simply invisible on a white card. The two themes need
          different values for the same semantic name, and a static JS
          object cannot switch on a selector.
        */
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        rim: "var(--shadow-rim)",
        "rim-strong": "var(--shadow-rim-strong)",
        card: "var(--shadow-card)",
        "card-hover": "var(--shadow-card-hover)",
        // Brand spill — a STATE, never decoration.
        "glow-sm": "var(--shadow-glow-sm)",
        "glow-md": "var(--shadow-glow-md)",
        "glow-lg": "var(--shadow-glow-lg)",
        focus: "var(--shadow-focus)",
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
        /*
          Ambient motion, for the marketing-weight surfaces only — the
          aurora wash, an empty state's icon, a hero badge. Never on a
          control: a button that breathes is a button people watch
          instead of press. All of it is suspended under
          prefers-reduced-motion by the global rule in globals.css.
        */
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "aurora-drift": {
          "0%, 100%": { transform: "translate3d(0, 0, 0) scale(1)" },
          "50%": { transform: "translate3d(0, -2%, 0) scale(1.06)" },
        },
        "gradient-pan": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "pop-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.55" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        "fade-up": "fade-up 180ms cubic-bezier(0.32, 0.72, 0, 1)",
        shimmer: "shimmer 1.6s infinite",
        float: "float 6s ease-in-out infinite",
        "aurora-drift": "aurora-drift 18s ease-in-out infinite",
        "gradient-pan": "gradient-pan 6s ease-in-out infinite",
        "pop-in": "pop-in 220ms cubic-bezier(0.32, 0.72, 0, 1)",
        "glow-pulse": "glow-pulse 3.2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
