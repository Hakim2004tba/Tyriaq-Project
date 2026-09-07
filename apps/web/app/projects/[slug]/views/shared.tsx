import { Flag } from "lucide-react";
import { cn } from "@flow/utils";
import { formatDate, formatDue, type Priority } from "@/lib/data/task-types";

const PRIORITY: Record<Priority, { text: string; label: string }> = {
  urgent: { text: "text-danger", label: "Urgent" },
  high: { text: "text-danger", label: "High" },
  medium: { text: "text-warning", label: "Medium" },
  low: { text: "text-success", label: "Low" },
};

export function Priority({ value, compact = false }: { value: Priority; compact?: boolean }) {
  const p = PRIORITY[value];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-caption font-medium", p.text)}>
      <Flag className={cn("size-3 shrink-0", value === "urgent" && "fill-current")} aria-hidden="true" />
      {compact ? <span className="sr-only">{p.label}</span> : p.label}
    </span>
  );
}

/**
 * A due date, carrying its own urgency — overdue reads danger, today
 * reads warning.
 *
 * A COMPLETED task switches to plain-date wording. "18 days overdue" on
 * a finished task is simply false: the deadline stopped applying the
 * moment the work landed, and leaving the urgency language there fills
 * the Done column with alarming red text about things that went fine.
 */
/** `offset` is null when the task carries no due date at all. */
export function Due({ offset, done, className }: { offset: number | null; done?: boolean; className?: string }) {
  const tone = done || offset === null
    ? "text-text-muted"
    : offset < 0
      ? "text-danger"
      : offset === 0
        ? "text-warning"
        : "text-text-muted";
  return (
    <span className={cn("whitespace-nowrap text-caption tabular", tone, className)}>
      {done ? formatDate(offset) : formatDue(offset)}
    </span>
  );
}

export function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-sm bg-surface-elevated px-1.5 py-0.5 text-caption text-text-secondary">
      {children}
    </span>
  );
}
