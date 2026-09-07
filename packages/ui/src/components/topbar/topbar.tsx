import * as React from "react";
import { cn } from "@flow/utils";

/**
 * The top chrome bar.
 *
 * Deliberately translucent with a blur: content scrolls *under* it and
 * stays faintly visible, which keeps the aurora continuous across the
 * seam between chrome and canvas. A solid bar here cuts the page in two.
 */
export const TopBar = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => (
    <header
      ref={ref}
      className={cn(
        "flex h-topbar shrink-0 items-center gap-3 border-b border-border px-5",
        "bg-background/70 backdrop-blur-xl",
        className
      )}
      {...props}
    />
  )
);
TopBar.displayName = "TopBar";
