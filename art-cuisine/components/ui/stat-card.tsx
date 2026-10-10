import * as React from "react";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export interface StatCardProps {
  label: string;
  value: string;
  helperText?: string;
  trend?: { value: string; direction: "up" | "down" };
  icon?: LucideIcon;
  className?: string;
}

function StatCard({ label, value, helperText, trend, icon: Icon, className }: StatCardProps) {
  return (
    <Card className={cn("p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          {label}
        </span>
        {Icon && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-sunken text-accent-strong">
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-display text-[1.75rem] leading-none text-text-primary">
          {value}
        </span>
        {trend && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-xs font-semibold",
              trend.direction === "up"
                ? "text-[var(--status-success-fg)]"
                : "text-[var(--status-danger-fg)]",
            )}
          >
            {trend.direction === "up" ? (
              <ArrowUpRight className="h-3.5 w-3.5" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5" />
            )}
            {trend.value}
          </span>
        )}
      </div>

      {helperText && (
        <p className="mt-1.5 text-xs text-text-muted">{helperText}</p>
      )}
    </Card>
  );
}

export { StatCard };
