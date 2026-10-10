"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

function OptionCard({
  label,
  description,
  selected,
  onSelect,
  compact = false,
}: {
  label: string;
  description?: string;
  selected: boolean;
  onSelect: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "focus-ring relative flex flex-col gap-1 rounded-md border text-left transition-colors duration-[var(--duration-fast)]",
        compact ? "px-4 py-3.5" : "px-5 py-5",
        selected
          ? "border-ink-950 bg-ink-950 text-text-inverse"
          : "border-border-default bg-surface-raised text-text-primary hover:border-ink-950/50",
      )}
    >
      <span className={cn("flex items-center justify-between gap-2 font-semibold", compact ? "text-sm" : "text-base")}>
        {label}
        {selected && <Check className="h-4 w-4 shrink-0 text-accent" />}
      </span>
      {description && (
        <span className={cn("text-xs leading-relaxed", selected ? "text-white/70" : "text-text-muted")}>
          {description}
        </span>
      )}
    </button>
  );
}

export { OptionCard };
