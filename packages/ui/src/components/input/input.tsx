import * as React from "react";
import { cn } from "@flow/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  /** Leading adornment — an icon, usually. Rendered inside the field. */
  icon?: React.ReactNode;
  /** Trailing adornment — a keyboard hint, a clear button, a unit. */
  trailing?: React.ReactNode;
}

/**
 * Fields are RECESSED, not raised: on a dark canvas an input that sits
 * proud of its surface reads as a button. `bg-surface-muted` sinks it
 * one step below the card it lives on, and the violet ring on focus is
 * the only moment it gains elevation.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, icon, trailing, ...props }, ref) => {
    const field = (
      <input
        ref={ref}
        className={cn(
          "h-9 w-full rounded-md border bg-surface-muted text-body text-text-primary",
          "placeholder:text-text-muted transition-[border-color,box-shadow] duration-fast",
          "focus-visible:outline-none focus-visible:border-primary/60 focus-visible:shadow-focus",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "read-only:cursor-default read-only:opacity-80",
          error ? "border-danger" : "border-border hover:border-border-strong",
          icon ? "pl-9" : "pl-3",
          trailing ? "pr-9" : "pr-3",
          className
        )}
        aria-invalid={error || undefined}
        {...props}
      />
    );

    if (!icon && !trailing) return field;

    return (
      <div className="relative w-full">
        {icon && (
          <span
            className="pointer-events-none absolute left-3 top-1/2 flex size-4 -translate-y-1/2 items-center justify-center text-text-muted"
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
        {field}
        {trailing && (
          <span className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center text-text-muted">
            {trailing}
          </span>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

/** Keyboard hint pill — ⌘K in the command bar, Esc in dialogs. */
export function Kbd({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        "rounded border border-border bg-white/5 px-1.5 py-0.5 font-sans text-[11px] font-medium leading-none text-text-muted",
        className
      )}
      {...props}
    />
  );
}
