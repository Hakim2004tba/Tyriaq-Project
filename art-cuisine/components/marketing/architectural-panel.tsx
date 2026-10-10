import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ArchitecturalPanelProps {
  variant?: 1 | 2 | 3 | 4 | 5 | 6;
  className?: string;
}

/**
 * Abstract architectural compositions used throughout the marketing site in
 * place of photography — layered stone / ink panes with a single gold
 * inlay line, each variant suggesting a different kitchen elevation without
 * depicting one literally.
 */
function ArchitecturalPanel({ variant = 1, className }: ArchitecturalPanelProps) {
  const content = PANELS[variant];
  return (
    <svg
      viewBox="0 0 400 300"
      fill="none"
      className={cn("h-full w-full", className)}
      aria-hidden
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={`ap-stone-${variant}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--stone-150)" />
          <stop offset="100%" stopColor="var(--stone-400)" />
        </linearGradient>
        <linearGradient id={`ap-ink-${variant}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--ink-800)" />
          <stop offset="100%" stopColor="var(--ink-950)" />
        </linearGradient>
        <linearGradient id={`ap-gold-${variant}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--gold-300)" />
          <stop offset="100%" stopColor="var(--gold-600)" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="var(--stone-100)" />
      {content(variant)}
    </svg>
  );
}

const PANELS: Record<number, (v: number) => ReactNode> = {
  1: (v) => (
    <>
      <rect x="0" y="170" width="400" height="130" fill={`url(#ap-stone-${v})`} />
      <rect x="30" y="40" width="150" height="230" fill={`url(#ap-ink-${v})`} opacity="0.94" />
      <rect x="55" y="70" width="100" height="45" fill="none" stroke="var(--gold-400)" strokeOpacity="0.3" />
      <rect x="55" y="130" width="100" height="45" fill="none" stroke="var(--gold-400)" strokeOpacity="0.3" />
      <rect x="55" y="190" width="100" height="45" fill="none" stroke="var(--gold-400)" strokeOpacity="0.3" />
      <rect x="210" y="150" width="6" height="120" fill={`url(#ap-gold-${v})`} />
      <line x1="230" y1="150" x2="370" y2="150" stroke="var(--gold-400)" strokeWidth="1.5" />
    </>
  ),
  2: (v) => (
    <>
      <rect x="0" y="0" width="400" height="300" fill={`url(#ap-stone-${v})`} opacity="0.55" />
      <rect x="60" y="60" width="280" height="8" fill={`url(#ap-ink-${v})`} />
      <rect x="60" y="90" width="280" height="8" fill={`url(#ap-ink-${v})`} opacity="0.7" />
      <rect x="60" y="120" width="180" height="8" fill={`url(#ap-ink-${v})`} opacity="0.5" />
      <circle cx="330" cy="200" r="46" fill="none" stroke="var(--gold-500)" strokeWidth="1.4" opacity="0.6" />
      <circle cx="330" cy="200" r="3" fill="var(--gold-500)" />
      <rect x="60" y="220" width="150" height="4" fill="var(--gold-400)" />
    </>
  ),
  3: (v) => (
    <>
      <rect x="0" y="0" width="400" height="300" fill={`url(#ap-ink-${v})`} />
      <rect x="40" y="40" width="140" height="220" fill="var(--stone-200)" opacity="0.08" />
      <rect x="200" y="40" width="160" height="140" fill="var(--stone-200)" opacity="0.14" />
      <line x1="200" y1="40" x2="200" y2="260" stroke="var(--gold-400)" strokeOpacity="0.5" />
      <line x1="40" y1="150" x2="180" y2="150" stroke="var(--gold-400)" strokeOpacity="0.35" />
      <circle cx="330" cy="230" r="2.5" fill="var(--gold-400)" />
      <circle cx="330" cy="245" r="2.5" fill="var(--gold-400)" />
    </>
  ),
  4: (v) => (
    <>
      <rect x="0" y="0" width="400" height="300" fill={`url(#ap-stone-${v})`} />
      <rect x="0" y="0" width="400" height="180" fill="var(--stone-50)" opacity="0.5" />
      <rect x="50" y="60" width="300" height="100" rx="4" fill={`url(#ap-ink-${v})`} />
      <rect x="50" y="60" width="300" height="8" fill="var(--stone-50)" opacity="0.5" />
      <rect x="80" y="190" width="4" height="70" fill={`url(#ap-gold-${v})`} />
      <rect x="100" y="180" width="160" height="4" fill={`url(#ap-gold-${v})`} />
    </>
  ),
  5: (v) => (
    <>
      <rect x="0" y="0" width="400" height="300" fill="var(--stone-150)" />
      <rect x="0" y="0" width="200" height="300" fill={`url(#ap-ink-${v})`} opacity="0.92" />
      <rect x="230" y="50" width="140" height="90" fill="none" stroke="var(--stone-500)" strokeOpacity="0.4" />
      <rect x="230" y="160" width="140" height="90" fill="none" stroke="var(--stone-500)" strokeOpacity="0.4" />
      <line x1="30" y1="230" x2="170" y2="230" stroke="var(--gold-400)" strokeWidth="1.5" />
      <circle cx="30" cy="230" r="3" fill="var(--gold-400)" />
      <circle cx="170" cy="230" r="3" fill="var(--gold-400)" />
    </>
  ),
  6: (v) => (
    <>
      <rect x="0" y="0" width="400" height="300" fill={`url(#ap-stone-${v})`} />
      <rect x="0" y="120" width="400" height="6" fill={`url(#ap-gold-${v})`} opacity="0.7" />
      <rect x="40" y="150" width="320" height="110" fill={`url(#ap-ink-${v})`} />
      <rect x="60" y="170" width="80" height="70" fill="none" stroke="var(--stone-400)" strokeOpacity="0.4" />
      <rect x="160" y="170" width="80" height="70" fill="none" stroke="var(--stone-400)" strokeOpacity="0.4" />
      <rect x="260" y="170" width="80" height="70" fill="none" stroke="var(--stone-400)" strokeOpacity="0.4" />
    </>
  ),
};

export { ArchitecturalPanel };
