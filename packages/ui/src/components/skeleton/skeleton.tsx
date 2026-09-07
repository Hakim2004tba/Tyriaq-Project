import * as React from "react";
import { cn } from "@flow/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-surface-muted motion-reduce:animate-none", className)}
      aria-hidden="true"
      {...props}
    />
  );
}
