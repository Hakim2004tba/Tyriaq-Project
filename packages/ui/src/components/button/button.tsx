import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@flow/utils";

/**
 * Tyriaq buttons.
 *
 * The primary variant is filled with `bg-brand` (the 500→700 gradient)
 * rather than flat `bg-primary`. That is an accessibility decision, not
 * a stylistic one: white on flat #8B5CF6 is ~3.5:1, below AA for a 13px
 * label. The gradient lands in the 600–700 range where white clears
 * 4.5:1, and it happens to be the brand's signature besides.
 *
 * Glow follows the system rule — it is a STATE. `primary` carries a
 * resting glow because it is the single most important control on any
 * screen; every other variant only glows on focus.
 */
export const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium " +
    "transition-all duration-fast ease-emphasized " +
    "focus-visible:outline-none focus-visible:shadow-focus " +
    "disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        primary:
          "bg-brand text-primary-foreground shadow-glow-sm hover:bg-brand-hover hover:shadow-glow-md " +
          "active:translate-y-px active:shadow-glow-sm",
        secondary:
          "border border-border bg-surface-elevated text-text-primary shadow-rim " +
          "hover:border-border-strong hover:bg-surface-elevated/80 active:translate-y-px",
        /** Violet-tinted, borderless — for secondary actions that are
         * still brand actions (e.g. "Add task" inside a list). */
        subtle:
          "bg-primary-subtle text-primary hover:bg-primary-muted active:translate-y-px",
        ghost: "text-text-secondary hover:bg-surface-elevated hover:text-text-primary active:translate-y-px",
        // Dark ink on the danger fill, not white: white on #FB7185 is 2.4:1.
        // No opacity modifier here — Tailwind cannot apply one to a var()
        // colour, and `bg-danger/90` silently compiles to nothing.
        destructive: "bg-danger font-semibold text-[#2A0810] hover:brightness-110 active:translate-y-px",
        link: "h-auto p-0 text-primary underline-offset-4 hover:text-primary-hover hover:underline",
      },
      size: {
        xs: "h-7 gap-1.5 px-2.5 text-caption",
        sm: "h-8 px-3 text-body-sm",
        md: "h-9 px-4 text-label",
        lg: "h-11 px-5 text-body",
        icon: "size-9 shrink-0 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  "aria-label"?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {children}
          </>
        )}
      </Comp>
    );
  }
);
Button.displayName = "Button";
