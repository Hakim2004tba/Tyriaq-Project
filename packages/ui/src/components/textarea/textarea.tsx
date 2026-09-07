import * as React from "react";
import { cn } from "@flow/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        // Recessed like Input — on a dark canvas a field that sits proud
        // of its surface reads as a button.
        "flex min-h-[80px] w-full rounded-md border bg-surface-muted px-3 py-2 text-body text-text-primary",
        "placeholder:text-text-muted transition-[border-color,box-shadow] duration-fast",
        "focus-visible:outline-none focus-visible:border-primary/60 focus-visible:shadow-focus",
        "disabled:cursor-not-allowed disabled:opacity-50",
        error ? "border-danger" : "border-border hover:border-border-strong",
        className
      )}
      aria-invalid={error || undefined}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";
