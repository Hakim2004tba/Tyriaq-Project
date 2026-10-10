"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-3">
      {steps.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                done && "bg-ink-950 text-text-inverse",
                active && "border-2 border-ink-950 text-ink-950",
                !done && !active && "border border-border-default text-text-muted",
              )}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
            </span>
            <span className={cn("text-xs font-medium uppercase tracking-wider", active ? "text-text-primary" : "text-text-muted")}>
              {label}
            </span>
            {index < steps.length - 1 && <span className="mx-1 h-px w-6 bg-border-default sm:w-10" />}
          </li>
        );
      })}
    </ol>
  );
}

export { StepIndicator };
