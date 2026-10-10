import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "accent" | "neutral" | "danger" | "warning" | "outline";

const variants: Record<Variant, string> = {
  accent: "bg-accent text-accent-foreground",
  neutral: "bg-surface-2 text-foreground border border-border",
  danger: "bg-danger/15 text-danger",
  warning: "bg-warning/15 text-warning",
  outline: "border border-accent-strong text-accent-strong bg-transparent",
};

export function Badge({
  className,
  variant = "neutral",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
