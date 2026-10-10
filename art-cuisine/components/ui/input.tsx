import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon, ...props }, ref) => {
    if (icon) {
      return (
        <div className="relative flex items-center">
          <span className="pointer-events-none absolute left-3.5 text-text-muted [&_svg]:h-4 [&_svg]:w-4">
            {icon}
          </span>
          <input
            type={type}
            className={cn(
              "focus-ring flex h-11 w-full rounded-md border border-border-default bg-surface-raised pl-10 pr-3.5 text-sm text-text-primary placeholder:text-text-muted transition-colors duration-[var(--duration-fast)] hover:border-stone-400 focus-visible:border-accent disabled:cursor-not-allowed disabled:opacity-50",
              className,
            )}
            ref={ref}
            {...props}
          />
        </div>
      );
    }
    return (
      <input
        type={type}
        className={cn(
          "focus-ring flex h-11 w-full rounded-md border border-border-default bg-surface-raised px-3.5 text-sm text-text-primary placeholder:text-text-muted transition-colors duration-[var(--duration-fast)] hover:border-stone-400 focus-visible:border-accent disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
