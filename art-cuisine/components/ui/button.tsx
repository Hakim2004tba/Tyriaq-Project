import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "focus-ring inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium tracking-wide transition-all duration-[var(--duration-fast)] ease-[var(--ease-editorial)] disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-ink-950 text-text-inverse shadow-elevation-sm hover:bg-ink-900 active:bg-ink-950",
        gold: "bg-accent text-ink-950 shadow-elevation-gold hover:bg-accent-strong",
        outline:
          "border border-border-strong bg-transparent text-text-primary hover:bg-stone-100",
        ghost: "bg-transparent text-text-primary hover:bg-stone-100",
        "ghost-inverse": "bg-transparent text-text-inverse hover:bg-white/10",
        link: "bg-transparent p-0 h-auto text-text-primary underline-offset-4 hover:underline",
        destructive:
          "bg-[var(--status-danger-fg)] text-white hover:opacity-90",
      },
      size: {
        sm: "h-9 px-3.5 text-[0.8125rem]",
        md: "h-11 px-5",
        lg: "h-13 px-7 text-[0.9375rem]",
        icon: "h-10 w-10 shrink-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
