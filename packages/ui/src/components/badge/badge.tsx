import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@flow/utils";

/**
 * Badges carry a tinted alpha fill rather than a solid one: on a dark
 * ground a solid pastel chip reads as a sticker pasted on top, while a
 * 12% tint of the same hue reads as the surface itself being lit. The
 * text stays at full saturation so it still clears contrast.
 */
export const badgeVariants = cva(
  "inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-sm px-2 py-0.5 text-caption font-medium",
  {
    variants: {
      variant: {
        neutral: "bg-surface-elevated text-text-secondary",
        primary: "bg-primary-muted text-primary",
        success: "bg-success-subtle text-success",
        warning: "bg-warning-subtle text-warning",
        danger: "bg-danger-subtle text-danger",
        info: "bg-info-subtle text-info",
        outline: "border border-border text-text-secondary",
        /** For counts on dark chrome (sidebar, topbar) where the tinted
         * fills would compete with the nav's own active state. */
        chrome: "bg-white/10 text-text-primary",
      },
      size: {
        sm: "px-1.5 py-0 text-[11px] leading-[18px]",
        md: "px-2 py-0.5",
      },
    },
    defaultVariants: { variant: "neutral", size: "md" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dotColor?: string;
}

export function Badge({ className, variant, size, dotColor, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size, className }))} {...props}>
      {dotColor && (
        <span
          className="size-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: dotColor }}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
