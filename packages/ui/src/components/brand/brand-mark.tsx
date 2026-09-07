import * as React from "react";
import { cn } from "@flow/utils";

export interface BrandMarkProps extends React.SVGAttributes<SVGSVGElement> {
  size?: number;
}

/**
 * The Tyriaq glyph.
 *
 * A folded "T" resolving into a forward chevron — the T of Tyriaq read
 * as motion. Built from two planes so the brand gradient has somewhere
 * to fall: the upper plane catches the light violet, the lower one sits
 * in shadow. Drawn as geometry rather than a font so it stays crisp at
 * 16px in the rail and at 64px on the marketing page.
 */
export function BrandMark({ size = 28, className, ...props }: BrandMarkProps) {
  const id = React.useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label="Tyriaq"
      className={cn("shrink-0", className)}
      {...props}
    >
      <defs>
        <linearGradient id={`${id}-a`} x1="4" y1="3" x2="28" y2="29" gradientUnits="userSpaceOnUse">
          <stop stopColor="#C4B5FD" />
          <stop offset="0.5" stopColor="#8B5CF6" />
          <stop offset="1" stopColor="#6D28D9" />
        </linearGradient>
        <linearGradient id={`${id}-b`} x1="8" y1="14" x2="26" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8B5CF6" />
          <stop offset="1" stopColor="#4C1D95" />
        </linearGradient>
      </defs>
      {/* Upper plane — the crossbar of the T, swept into a chevron. */}
      <path
        d="M5.2 4.6A1.6 1.6 0 0 1 6.8 3h18.4a1.6 1.6 0 0 1 1.29 2.55l-5.2 7.1a1.6 1.6 0 0 1-1.29.65h-4.1l-3.66 5a1.6 1.6 0 0 1-2.87-1.32L11.1 10.2H6.8a1.6 1.6 0 0 1-1.6-1.6V4.6Z"
        fill={`url(#${id}-a)`}
      />
      {/* Lower plane — the stem, offset so the two read as folded paper. */}
      <path
        d="M13.9 16.4a1.6 1.6 0 0 1 2.9-.35l1.4 2.4 5.6-.02a1.6 1.6 0 0 1 1.3 2.53l-6.2 8.5A1.6 1.6 0 0 1 16 28.5l.02-6.1-1.75-3.02a1.6 1.6 0 0 1-.37-1.02v-1.96Z"
        fill={`url(#${id}-b)`}
        opacity="0.95"
      />
    </svg>
  );
}

export interface WordmarkProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: number;
  /** Hides the text, leaving only the glyph — the collapsed rail. */
  markOnly?: boolean;
}

/** Glyph + wordmark lockup. The only place the product name is set. */
export function Wordmark({ size = 26, markOnly = false, className, ...props }: WordmarkProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)} {...props}>
      <BrandMark size={size} />
      {!markOnly && (
        <span
          className="font-display text-[19px] font-bold leading-none tracking-[-0.03em] text-text-primary"
          style={{ letterSpacing: "-0.03em" }}
        >
          tyriaq
        </span>
      )}
    </span>
  );
}
