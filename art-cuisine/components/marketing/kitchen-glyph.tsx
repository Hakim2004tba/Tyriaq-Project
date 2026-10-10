import { cn } from "@/lib/utils";

/**
 * Abstract architectural mark used in place of stock photography —
 * layered stone/gold panes suggesting a kitchen island + cabinetry silhouette.
 */
function KitchenGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 640 520"
      fill="none"
      className={cn("h-full w-full", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id="kg-stone" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--stone-200)" />
          <stop offset="100%" stopColor="var(--stone-400)" />
        </linearGradient>
        <linearGradient id="kg-ink" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--ink-800)" />
          <stop offset="100%" stopColor="var(--ink-950)" />
        </linearGradient>
        <linearGradient id="kg-gold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--gold-300)" />
          <stop offset="100%" stopColor="var(--gold-600)" />
        </linearGradient>
      </defs>

      <rect x="0" y="360" width="640" height="160" fill="var(--stone-100)" />
      <rect x="40" y="120" width="230" height="360" fill="url(#kg-ink)" opacity="0.92" />
      <rect x="60" y="150" width="190" height="70" fill="none" stroke="var(--gold-400)" strokeOpacity="0.35" />
      <rect x="60" y="240" width="190" height="70" fill="none" stroke="var(--gold-400)" strokeOpacity="0.35" />
      <rect x="60" y="330" width="190" height="70" fill="none" stroke="var(--gold-400)" strokeOpacity="0.35" />

      <rect x="120" y="300" width="440" height="130" rx="6" fill="url(#kg-stone)" />
      <rect x="120" y="300" width="440" height="10" fill="var(--stone-50)" opacity="0.6" />
      <rect x="150" y="200" width="6" height="120" fill="url(#kg-gold)" />
      <rect x="170" y="180" width="220" height="6" fill="url(#kg-gold)" />

      <circle cx="500" cy="220" r="3" fill="var(--gold-400)" />
      <circle cx="500" cy="250" r="3" fill="var(--gold-400)" />
      <line x1="500" y1="150" x2="500" y2="210" stroke="var(--gold-400)" strokeWidth="1.5" />
    </svg>
  );
}

export { KitchenGlyph };
