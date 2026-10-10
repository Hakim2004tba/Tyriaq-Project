import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  primary:
    "nb-gradient-accent text-accent-foreground font-semibold hover:brightness-110 hover:shadow-[0_0_30px_rgba(57,255,138,0.35)] active:scale-[0.98]",
  secondary:
    "bg-surface-2 text-foreground border border-border hover:border-accent-strong hover:text-accent-strong active:scale-[0.98]",
  outline:
    "bg-transparent border border-border text-foreground hover:border-accent-strong hover:text-accent-strong active:scale-[0.98]",
  ghost: "bg-transparent text-foreground hover:bg-surface-2 active:scale-[0.98]",
  danger: "bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25 active:scale-[0.98]",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm rounded-lg",
  md: "h-11 px-5 text-sm rounded-xl",
  lg: "h-12 px-7 text-base rounded-xl",
  icon: "h-10 w-10 rounded-lg",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }
>(({ className, variant = "primary", size = "md", ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none cursor-pointer",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
});
Button.displayName = "Button";
