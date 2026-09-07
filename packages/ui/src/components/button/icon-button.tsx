import * as React from "react";
import { cn } from "@flow/utils";
import { Button, type ButtonProps } from "./button";

export interface IconButtonProps extends Omit<ButtonProps, "size"> {
  /** Required — an icon alone is not an accessible name, and these are
   * the controls keyboard and screen-reader users reach for most in a
   * dense productivity UI. */
  label: string;
  /** `sm` (32px) for chrome and toolbars, `md` (36px) for content. */
  size?: "sm" | "md";
}

/** Icon-only button. `label` becomes the accessible name. */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, variant = "ghost", size = "md", className, children, ...props }, ref) => (
    <Button
      ref={ref}
      size="icon"
      variant={variant}
      aria-label={label}
      className={cn(size === "sm" && "size-8", className)}
      {...props}
    >
      {children}
    </Button>
  )
);
IconButton.displayName = "IconButton";
