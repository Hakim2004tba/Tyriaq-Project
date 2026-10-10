import * as React from "react";
import { cn } from "@/lib/utils";

function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "text-xs font-semibold uppercase tracking-wider text-text-secondary",
        className,
      )}
      {...props}
    />
  );
}

export { Label };
