"use client";

import { cn } from "@flow/utils";
import { SPACE_COLOR } from "@/components/shell";
import type { SpaceColor } from "@/lib/data/types";
import { SPACE_ICONS } from "./space-icons";

const SIZES = {
  xs: "size-[22px] rounded-[7px] [&>svg]:size-3",
  sm: "size-7 rounded-lg [&>svg]:size-3.5",
  md: "size-9 rounded-lg [&>svg]:size-4",
  lg: "size-12 rounded-xl [&>svg]:size-6",
} as const;

/**
 * A space's identity chip — icon on its colour.
 *
 * Icon AND colour together, never colour alone: six spaces on six hues
 * are indistinguishable to a colour-blind reader and hard to tell apart
 * for anyone at 22px in the rail.
 */
export function SpaceBadge({
  icon,
  color,
  size = "sm",
  className,
}: {
  icon: string;
  color: SpaceColor;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const Icon = SPACE_ICONS[icon] ?? SPACE_ICONS.layers!;
  const c = SPACE_COLOR[color];
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center ring-1 ring-inset",
        SIZES[size],
        c.chip,
        c.text,
        className
      )}
      aria-hidden="true"
    >
      <Icon />
    </span>
  );
}
