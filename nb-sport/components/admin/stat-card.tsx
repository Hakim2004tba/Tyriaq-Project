import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  accent = "default",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  trend?: string;
  accent?: "default" | "warning" | "danger";
}) {
  return (
    <div className="nb-card glow-border flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl",
            accent === "warning" && "bg-warning/15",
            accent === "danger" && "bg-danger/15",
            accent === "default" && "bg-accent/15"
          )}
        >
          <Icon
            className={cn(
              "h-5 w-5",
              accent === "warning" && "text-warning",
              accent === "danger" && "text-danger",
              accent === "default" && "text-accent-strong"
            )}
          />
        </div>
        {trend && <span className="text-xs font-semibold text-accent-strong">{trend}</span>}
      </div>
      <div>
        <p className="text-2xl font-black">{value}</p>
        <p className="text-xs text-muted">{label}</p>
      </div>
    </div>
  );
}
