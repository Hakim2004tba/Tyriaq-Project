import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "focus-ring flex min-h-28 w-full rounded-md border border-border-default bg-surface-raised px-3.5 py-3 text-sm text-text-primary placeholder:text-text-muted transition-colors duration-[var(--duration-fast)] hover:border-stone-400 focus-visible:border-accent disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
