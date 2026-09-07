import * as React from "react";
import { FileText } from "lucide-react";
import { cn } from "@flow/utils";

export interface DocumentIconProps {
  icon?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASSES = {
  sm: "size-6 text-body-sm",
  md: "size-9 text-h4",
  lg: "size-12 text-h3",
};

/** A document's icon: a chosen emoji if set, otherwise the default
 * document glyph. No image-upload icon picker (brief section 37). */
export function DocumentIcon({ icon, size = "md", className }: DocumentIconProps) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md bg-primary-subtle text-primary",
        SIZE_CLASSES[size],
        className
      )}
      aria-hidden="true"
    >
      {icon ? icon : <FileText className={size === "sm" ? "size-3.5" : size === "lg" ? "size-6" : "size-4.5"} />}
    </span>
  );
}
