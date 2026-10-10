import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-wider leading-none",
  {
    variants: {
      variant: {
        neutral:
          "border-transparent bg-[var(--status-neutral-bg)] text-[var(--status-neutral-fg)]",
        info: "border-transparent bg-[var(--status-info-bg)] text-[var(--status-info-fg)]",
        warning:
          "border-transparent bg-[var(--status-warning-bg)] text-[var(--status-warning-fg)]",
        success:
          "border-transparent bg-[var(--status-success-bg)] text-[var(--status-success-fg)]",
        danger:
          "border-transparent bg-[var(--status-danger-bg)] text-[var(--status-danger-fg)]",
        gold: "border-transparent bg-accent-soft text-ink-950",
        outline: "border-border-default bg-transparent text-text-secondary",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span
          className="h-1.5 w-1.5 rounded-full bg-current opacity-70"
          aria-hidden
        />
      )}
      {children}
    </span>
  );
}

export { Badge, badgeVariants };
