/**
 * Due-date display helpers, shared by TaskCard and TaskRow so both
 * views render dates identically (same data, same presentation rules).
 */
export function formatTaskDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export type DueDateUrgency = "overdue" | "today" | "soon" | "normal";

export function getDueDateUrgency(isoDate: string, now: Date = new Date()): DueDateUrgency {
  const due = new Date(`${isoDate}T00:00:00`);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86_400_000);

  if (diffDays < 0) return "overdue";
  if (diffDays === 0) return "today";
  if (diffDays <= 2) return "soon";
  return "normal";
}

export const DUE_DATE_URGENCY_CLASSES: Record<DueDateUrgency, string> = {
  overdue: "text-danger",
  today: "text-warning",
  soon: "text-text-secondary",
  normal: "text-text-muted",
};
