import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge, taught the project's own scales.
 *
 * Out of the box it only recognises Tailwind's default utilities, so it
 * classifies every custom `text-*` size (`text-label`, `text-body-sm`,
 * `text-h4`, …) as a text COLOUR. That puts it in the same conflict
 * group as `text-primary` and `text-text-secondary`, and the later class
 * silently deletes the earlier one — so a component whose size variant
 * is declared after its colour variant renders with no colour at all,
 * with nothing in the build to warn you.
 *
 * Registering the scales here fixes it once for all 70+ components
 * rather than forcing every `cva` definition to order its variants
 * around a merge-library quirk.
 */
const FONT_SIZES = [
  "display-lg",
  "display",
  "h1",
  "h2",
  "h3",
  "h4",
  "metric",
  "body-lg",
  "body",
  "body-sm",
  "caption",
  "label",
  "overline",
] as const;

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: [...FONT_SIZES] }],
      shadow: [{ shadow: ["rim", "rim-strong", "card", "card-hover", "glow-sm", "glow-md", "glow-lg", "focus"] }],
    },
  },
});

/** Merge Tailwind class lists safely (used by every @flow/ui component). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
