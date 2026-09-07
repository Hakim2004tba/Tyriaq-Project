import * as React from "react";
import { cn } from "@flow/utils";

export interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
  label?: string;
}

export function Divider({ className, orientation = "horizontal", label, ...props }: DividerProps) {
  if (orientation === "vertical") {
    return <div role="separator" aria-orientation="vertical" className={cn("w-px self-stretch bg-border", className)} {...props} />;
  }
  if (label) {
    return (
      <div className={cn("flex items-center gap-3", className)} {...props}>
        <div role="separator" className="h-px flex-1 bg-border" />
        <span className="text-caption text-text-muted">{label}</span>
        <div role="separator" className="h-px flex-1 bg-border" />
      </div>
    );
  }
  return <div role="separator" aria-orientation="horizontal" className={cn("h-px w-full bg-border", className)} {...props} />;
}
