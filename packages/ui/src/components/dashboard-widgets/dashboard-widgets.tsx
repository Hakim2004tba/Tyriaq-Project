import * as React from "react";
import { Calendar, AlertTriangle, Users } from "lucide-react";
import type { TaskWithAssignees, TaskStatus, TaskPriority } from "@flow/types";
import { formatTaskDate, getDueDateUrgency, DUE_DATE_URGENCY_CLASSES } from "../../lib/task-date";
import { PRIORITY_CONFIG } from "../priority-badge/priority-badge";
import { TASK_STATUS_CONFIG } from "../task-status/task-status";
import { Avatar } from "../avatar/avatar";

/** Generic widget chrome — every dashboard widget is this card shape,
 * so the grid stays visually consistent without each widget re-styling
 * its own container. */
export function DashboardWidgetCard({
  title,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  icon: React.ElementType;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-label text-text-primary">
          <Icon className="size-4 text-text-muted" aria-hidden="true" />
          {title}
        </span>
        {action}
      </div>
      {children}
    </div>
  );
}

/** All 6 widgets below are pure — they take already-computed counts or
 * an already-filtered task list as props. No widget fetches anything;
 * the caller derives everything from the same task/member arrays it
 * already holds (never a fabricated number). */

export function TaskProgressWidget({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <div className="flex flex-col items-center gap-2 py-2">
      <div
        className="relative flex size-24 items-center justify-center rounded-full"
        style={{ background: `conic-gradient(rgb(var(--color-primary)) ${pct * 3.6}deg, rgb(var(--color-surface-muted)) 0deg)` }}
      >
        <div className="flex size-[72px] items-center justify-center rounded-full bg-surface">
          <span className="text-h4 font-semibold text-text-primary">{pct}%</span>
        </div>
      </div>
      <p className="text-caption text-text-muted">
        {completed} of {total} task{total === 1 ? "" : "s"} completed
      </p>
    </div>
  );
}

const STATUS_DOT_CLASSES: Record<TaskStatus, string> = {
  todo: "bg-text-muted",
  in_progress: "bg-primary",
  review: "bg-warning",
  done: "bg-success",
};

export function TasksByStatusWidget({ counts }: { counts: Record<TaskStatus, number> }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const statuses = Object.keys(counts) as TaskStatus[];
  return (
    <div className="flex flex-col gap-2">
      {statuses.map((status) => (
        <div key={status} className="flex items-center justify-between text-body-sm">
          <span className="flex items-center gap-2 text-text-secondary">
            <span className={`size-2 rounded-full ${STATUS_DOT_CLASSES[status]}`} aria-hidden="true" />
            {TASK_STATUS_CONFIG[status].label}
          </span>
          <span className="font-medium text-text-primary">{counts[status]}</span>
        </div>
      ))}
      <div className="mt-1 flex h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
        {statuses.map((status) =>
          counts[status] > 0 ? (
            <div key={status} className={STATUS_DOT_CLASSES[status]} style={{ width: `${(counts[status] / Math.max(total, 1)) * 100}%` }} />
          ) : null
        )}
      </div>
    </div>
  );
}

export function TasksByPriorityWidget({ counts }: { counts: Record<TaskPriority, number> }) {
  const priorities = (Object.keys(counts) as TaskPriority[]).filter((p) => p !== "none" || counts.none > 0);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return <p className="text-body-sm text-text-muted">No tasks yet.</p>;
  return (
    <div className="flex flex-col gap-2">
      {priorities.map((priority) => {
        const Icon = priority === "none" ? null : PRIORITY_CONFIG[priority].icon;
        return (
          <div key={priority} className="flex items-center justify-between text-body-sm">
            <span className="flex items-center gap-2 text-text-secondary">
              {Icon && <Icon className="size-3.5" aria-hidden="true" />}
              {priority === "none" ? "No priority" : PRIORITY_CONFIG[priority].label}
            </span>
            <span className="font-medium text-text-primary">{counts[priority]}</span>
          </div>
        );
      })}
    </div>
  );
}

export function UpcomingTasksWidget({ tasks }: { tasks: TaskWithAssignees[] }) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 py-4 text-center">
        <span className="flex size-9 items-center justify-center rounded-full bg-primary-subtle text-primary">
          <Calendar className="size-4" aria-hidden="true" />
        </span>
        <p className="text-body-sm font-medium text-text-primary">No upcoming tasks</p>
        <p className="text-caption text-text-muted">You&apos;re all caught up!</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col divide-y divide-border">
      {tasks.map((task) => (
        <div key={task.id} className="flex items-center justify-between gap-2 py-2 text-body-sm">
          <span className="min-w-0 truncate text-text-primary">{task.title}</span>
          <span className="shrink-0 text-caption text-text-muted">{formatTaskDate(task.dueDate!)}</span>
        </div>
      ))}
    </div>
  );
}

export function OverdueTasksWidget({ tasks }: { tasks: TaskWithAssignees[] }) {
  if (tasks.length === 0) {
    return <p className="py-4 text-center text-body-sm text-text-muted">Nothing overdue.</p>;
  }
  return (
    <div className="flex flex-col divide-y divide-border">
      {tasks.map((task) => {
        const urgency = task.dueDate ? getDueDateUrgency(task.dueDate) : null;
        return (
          <div key={task.id} className="flex items-center justify-between gap-2 py-2 text-body-sm">
            <span className="flex min-w-0 items-center gap-1.5 truncate text-text-primary">
              <AlertTriangle className="size-3.5 shrink-0 text-danger" aria-hidden="true" />
              <span className="truncate">{task.title}</span>
            </span>
            <span className={`shrink-0 text-caption ${urgency ? DUE_DATE_URGENCY_CLASSES[urgency] : "text-text-muted"}`}>
              {formatTaskDate(task.dueDate!)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export interface WorkloadEntry {
  userId: string;
  name: string;
  avatarUrl: string | null;
  openTaskCount: number;
}

export function WorkloadWidget({ entries }: { entries: WorkloadEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 py-4 text-center">
        <span className="flex size-9 items-center justify-center rounded-full bg-primary-subtle text-primary">
          <Users className="size-4" aria-hidden="true" />
        </span>
        <p className="text-body-sm text-text-muted">No assigned tasks yet.</p>
      </div>
    );
  }
  const max = Math.max(...entries.map((e) => e.openTaskCount), 1);
  return (
    <div className="flex flex-col gap-2.5">
      {entries.map((entry) => (
        <div key={entry.userId} className="flex items-center gap-2.5">
          <Avatar name={entry.name} src={entry.avatarUrl} size="xs" />
          <span className="w-20 shrink-0 truncate text-body-sm text-text-primary">{entry.name}</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${(entry.openTaskCount / max) * 100}%` }} />
          </div>
          <span className="w-4 shrink-0 text-right text-caption text-text-muted">{entry.openTaskCount}</span>
        </div>
      ))}
    </div>
  );
}
