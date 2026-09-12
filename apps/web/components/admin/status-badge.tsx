import { cn } from "@flow/utils";
import { PLAN_META, type PlanId } from "@/lib/data/admin-sample";

/**
 * Status, said in colour AND in words.
 *
 * Operations work is scanned, not read, so a state needs to be legible
 * at a glance — but never by colour alone, since "past due" and
 * "cancelled" both matter and one of them costs money to confuse.
 */
const TONES: Record<string, string> = {
  active: "bg-success-subtle text-success ring-success/30",
  operational: "bg-success-subtle text-success ring-success/30",
  resolved: "bg-success-subtle text-success ring-success/30",
  success: "bg-success-subtle text-success ring-success/30",
  trialing: "bg-info-subtle text-info ring-info/30",
  invited: "bg-info-subtle text-info ring-info/30",
  waiting: "bg-info-subtle text-info ring-info/30",
  past_due: "bg-warning-subtle text-warning ring-warning/30",
  degraded: "bg-warning-subtle text-warning ring-warning/30",
  over_limit: "bg-warning-subtle text-warning ring-warning/30",
  open: "bg-warning-subtle text-warning ring-warning/30",
  suspended: "bg-danger-subtle text-danger ring-danger/30",
  cancelled: "bg-danger-subtle text-danger ring-danger/30",
  down: "bg-danger-subtle text-danger ring-danger/30",
  failed: "bg-danger-subtle text-danger ring-danger/30",
  denied: "bg-danger-subtle text-danger ring-danger/30",
  archived: "bg-surface-elevated text-text-muted ring-border",
};

const LABELS: Record<string, string> = {
  past_due: "Past due",
  over_limit: "Over limit",
  trialing: "Trial",
  operational: "Operational",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const label = LABELS[status] ?? status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-caption font-medium ring-1 ring-inset",
        TONES[status] ?? "bg-surface-elevated text-text-secondary ring-border",
        className
      )}
    >
      <span className="size-1.5 shrink-0 rounded-full bg-current opacity-80" aria-hidden="true" />
      {label}
    </span>
  );
}

export function PlanBadge({ plan, className }: { plan: PlanId; className?: string }) {
  const meta = PLAN_META[plan];
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded-md px-1.5 py-0.5 text-caption font-medium ring-1 ring-inset",
        meta.tone,
        className
      )}
    >
      {meta.label}
    </span>
  );
}
