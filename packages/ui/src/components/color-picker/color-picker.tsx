import * as React from "react";
import { Check } from "lucide-react";
import { PROJECT_COLORS, type ProjectColor } from "@flow/types";
import { cn } from "@flow/utils";
import { PROJECT_COLOR_CLASSES, PROJECT_COLOR_LABELS } from "../../lib/project-color";

export interface ColorPickerProps {
  value: ProjectColor;
  onChange: (color: ProjectColor) => void;
  name?: string;
  className?: string;
}

/** Restricts selection to the controlled semantic palette — never a free-form color input. */
export function ColorPicker({ value, onChange, name, className }: ColorPickerProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)} role="radiogroup" aria-label="Project color">
      {name && <input type="hidden" name={name} value={value} />}
      {PROJECT_COLORS.map((color) => {
        const selected = color === value;
        return (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={PROJECT_COLOR_LABELS[color]}
            onClick={() => onChange(color)}
            className={cn(
              "flex size-8 items-center justify-center rounded-full transition-transform duration-fast",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              PROJECT_COLOR_CLASSES[color].dot,
              selected && "ring-2 ring-offset-2 ring-text-primary scale-110"
            )}
          >
            {selected && <Check className="size-4 text-white" aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
}
