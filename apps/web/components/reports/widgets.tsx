"use client";

import Link from "next/link";
import {
  Activity,
  CheckCircle2,
  Clock,
  FolderKanban,
  GripVertical,
  Trophy,
  X,
} from "lucide-react";
import { Avatar, Badge, Progress } from "@flow/ui";
import { cn } from "@flow/utils";
import { formatRelative } from "@/lib/data/task-types";
import type { ReportData } from "@/lib/data/analytics";
import { BarChart } from "./charts/bar-chart";
import { ChartFrame } from "./charts/chart-frame";
import { DonutChart } from "./charts/donut-chart";
import { LineChart } from "./charts/line-chart";
import { CATEGORICAL, PRIORITY_COLOR, STATUS_COLOR, categorical } from "./charts/palette";

export const WIDGETS = [
  "trend",
  "status",
  "priority",
  "projects",
  "team",
  "workload",
  "time",
  "activity",
] as const;

export type WidgetId = (typeof WIDGETS)[number];

export const WIDGET_META: Record<WidgetId, { title: string; description: string; wide?: boolean }> = {
  trend: { title: "Created vs completed", description: "Throughput over the selected range", wide: true },
  status: { title: "Tasks by status", description: "Where open work is sitting" },
  priority: { title: "Tasks by priority", description: "How open work is weighted" },
  projects: { title: "Project progress", description: "Completion, overdue and time per project", wide: true },
  team: { title: "Team productivity", description: "Ranked by tasks completed" },
  workload: { title: "Workload", description: "Open tasks per person" },
  time: { title: "Time by project", description: "Where the hours went" },
  activity: { title: "Recent activity", description: "The latest changes across the workspace", wide: true },
};

export function formatMinutes(total: number): string {
  if (total === 0) return "0h";
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/**
 * One widget in its card.
 *
 * The drag handle and the remove button live on the card, not inside
 * each chart, so every widget behaves the same however different its
 * contents are.
 */
export function WidgetCard({
  id,
  data,
  editing,
  dragging,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  id: WidgetId;
  data: ReportData;
  editing: boolean;
  dragging: boolean;
  onRemove: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onDragEnd: () => void;
}) {
  const meta = WIDGET_META[id];

  return (
    <section
      draggable={editing}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={cn(
        "relative min-w-0 rounded-lg border bg-surface p-4 shadow-card transition-all duration-fast",
        meta.wide && "xl:col-span-2",
        dragging ? "border-border-brand opacity-50" : "border-border",
        editing && "cursor-grab active:cursor-grabbing"
      )}
    >
      {editing && (
        <div className="absolute right-2 top-2 z-10 flex items-center gap-1">
          <span className="flex size-7 items-center justify-center text-text-muted" aria-hidden="true">
            <GripVertical className="size-4" />
          </span>
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${meta.title}`}
            className="flex size-7 items-center justify-center rounded-md text-text-muted transition-colors
                       hover:bg-danger-subtle hover:text-danger focus-visible:outline-none focus-visible:shadow-focus"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      <WidgetBody id={id} data={data} />
    </section>
  );
}

function WidgetBody({ id, data }: { id: WidgetId; data: ReportData }) {
  const meta = WIDGET_META[id];

  if (id === "trend") {
    return (
      <ChartFrame
        title={meta.title}
        subtitle={meta.description}
        legend={[
          { label: "Created", color: CATEGORICAL[2] },
          { label: "Completed", color: CATEGORICAL[5] },
        ]}
        table={{
          columns: ["Date", "Created", "Completed"],
          rows: data.series.map((p) => [p.date, p.created, p.completed]),
        }}
      >
        <LineChart
          labels={data.series.map((p) => p.date)}
          series={[
            { key: "created", label: "Created", color: CATEGORICAL[2], values: data.series.map((p) => p.created) },
            { key: "completed", label: "Completed", color: CATEGORICAL[5], values: data.series.map((p) => p.completed) },
          ]}
        />
      </ChartFrame>
    );
  }

  if (id === "status") {
    const total = data.byStatus.reduce((sum, s) => sum + s.count, 0);
    return (
      <ChartFrame
        title={meta.title}
        subtitle={meta.description}
        table={{
          columns: ["Status", "Tasks"],
          rows: data.byStatus.map((s) => [s.label, s.count]),
        }}
      >
        <DonutChart
          slices={data.byStatus
            .filter((s) => s.count > 0)
            .map((s) => ({ key: s.key, label: s.label, value: s.count, color: STATUS_COLOR[s.key] ?? "#6B6480" }))}
          centerLabel="tasks"
          centerValue={String(total)}
        />
      </ChartFrame>
    );
  }

  if (id === "priority") {
    const total = data.byPriority.reduce((sum, s) => sum + s.count, 0);
    return (
      <ChartFrame
        title={meta.title}
        subtitle={meta.description}
        table={{
          columns: ["Priority", "Tasks"],
          rows: data.byPriority.map((s) => [s.label, s.count]),
        }}
      >
        <DonutChart
          slices={data.byPriority
            .filter((s) => s.count > 0)
            .map((s) => ({ key: s.key, label: s.label, value: s.count, color: PRIORITY_COLOR[s.key] ?? "#6B6480" }))}
          centerLabel="open"
          centerValue={String(total)}
        />
      </ChartFrame>
    );
  }

  if (id === "projects") {
    return (
      <ChartFrame
        title={meta.title}
        subtitle={meta.description}
        table={{
          columns: ["Project", "Tasks", "Done", "Overdue", "Time", "Progress"],
          rows: data.projects.map((p) => [p.name, p.total, p.done, p.overdue, formatMinutes(p.minutes), `${p.progress}%`]),
        }}
      >
        {data.projects.length === 0 ? (
          <p className="py-6 text-center text-body-sm text-text-muted">
            No projects have tasks in this range.
          </p>
        ) : (
          <div className="-mx-1 overflow-x-auto">
            <table className="w-full min-w-[34rem] text-body-sm">
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="px-1 pb-2 text-left text-caption font-medium text-text-muted">Project</th>
                  <th scope="col" className="px-1 pb-2 text-right text-caption font-medium text-text-muted">Tasks</th>
                  <th scope="col" className="px-1 pb-2 text-right text-caption font-medium text-text-muted">Overdue</th>
                  <th scope="col" className="px-1 pb-2 text-right text-caption font-medium text-text-muted">Time</th>
                  <th scope="col" className="w-[38%] px-1 pb-2 text-left text-caption font-medium text-text-muted">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.projects.map((project) => (
                  <tr key={project.id} className="group">
                    <td className="max-w-[12rem] truncate px-1 py-2">
                      <Link
                        href={`/projects/${project.slug}`}
                        className="text-text-primary transition-colors hover:text-primary
                                   focus-visible:outline-none focus-visible:shadow-focus"
                      >
                        {project.name}
                      </Link>
                    </td>
                    <td className="px-1 py-2 text-right tabular text-text-secondary">
                      {project.done}/{project.total}
                    </td>
                    <td className="px-1 py-2 text-right tabular">
                      {project.overdue > 0 ? (
                        <span className="text-danger">{project.overdue}</span>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </td>
                    <td className="px-1 py-2 text-right tabular text-text-secondary">
                      {formatMinutes(project.minutes)}
                    </td>
                    <td className="px-1 py-2">
                      <span className="flex items-center gap-2">
                        <Progress
                          value={project.progress}
                          label={`${project.name} progress`}
                          tone={project.overdue > 0 ? "warning" : "brand"}
                          className="flex-1"
                        />
                        <span className="w-9 shrink-0 text-right text-caption tabular text-text-secondary">
                          {project.progress}%
                        </span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartFrame>
    );
  }

  if (id === "team") {
    const ranked = data.members.slice(0, 8);
    return (
      <ChartFrame
        title={meta.title}
        subtitle={meta.description}
        table={{
          columns: ["Person", "Completed", "Assigned", "Rate", "Time"],
          rows: data.members.map((m) => [m.name, m.completed, m.assigned, `${m.completionRate}%`, formatMinutes(m.minutes)]),
        }}
      >
        {ranked.length === 0 ? (
          <p className="py-6 text-center text-body-sm text-text-muted">
            Nobody has completed work in this range.
          </p>
        ) : (
          <ol className="flex flex-col gap-2">
            {ranked.map((member, index) => (
              <li key={member.id} className="flex min-w-0 items-center gap-2.5">
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-md text-caption font-semibold tabular",
                    index === 0
                      ? "bg-warning-subtle text-warning"
                      : "bg-surface-elevated text-text-muted"
                  )}
                >
                  {index === 0 ? <Trophy className="size-3.5" aria-label="Top" /> : index + 1}
                </span>
                <Avatar name={member.name} size="xs" />
                <span className="min-w-0 flex-1 truncate text-body-sm text-text-primary">{member.name}</span>
                <span className="shrink-0 text-caption tabular text-text-muted">
                  {formatMinutes(member.minutes)}
                </span>
                <Badge variant={member.completionRate >= 70 ? "success" : "neutral"} size="sm">
                  {member.completed} done
                </Badge>
              </li>
            ))}
          </ol>
        )}
      </ChartFrame>
    );
  }

  if (id === "workload") {
    return (
      <ChartFrame
        title={meta.title}
        subtitle={meta.description}
        table={{
          columns: ["Person", "Open", "Overdue"],
          rows: data.workload.map((w) => [w.name, w.open, w.overdue]),
        }}
      >
        <BarChart
          bars={data.workload.slice(0, 8).map((row, i) => ({
            key: row.id,
            label: row.name,
            value: row.open,
            // Overdue work is a STATE, so it takes the reserved status
            // colour rather than a series hue.
            color: row.overdue > 0 ? "#E11D48" : categorical(i),
            detail: row.overdue > 0 ? `${row.overdue} overdue of ${row.open} open` : `${row.open} open`,
          }))}
          emptyLabel="Nobody has open tasks assigned."
        />
      </ChartFrame>
    );
  }

  if (id === "time") {
    const total = data.timeByProject.reduce((sum, row) => sum + row.minutes, 0);
    return (
      <ChartFrame
        title={meta.title}
        subtitle={meta.description}
        table={{
          columns: ["Project", "Time"],
          rows: data.timeByProject.map((row) => [row.name, formatMinutes(row.minutes)]),
        }}
        action={
          total > 0 ? (
            <span className="text-caption tabular text-text-muted">{formatMinutes(total)}</span>
          ) : undefined
        }
      >
        <BarChart
          bars={data.timeByProject.slice(0, 8).map((row, i) => ({
            key: row.id,
            label: row.name,
            value: row.minutes,
            color: categorical(i),
            detail: total > 0 ? `${Math.round((row.minutes / total) * 100)}% of tracked time` : undefined,
          }))}
          formatValue={formatMinutes}
          emptyLabel="No time logged in this range. Log time from a task's details panel."
        />
      </ChartFrame>
    );
  }

  const ICON: Record<string, typeof Activity> = {
    created: FolderKanban,
    status: CheckCircle2,
    logged: Clock,
  };

  return (
    <ChartFrame
      title={meta.title}
      subtitle={meta.description}
      table={{
        columns: ["When", "Who", "What"],
        rows: data.activity.map((a) => [formatRelative(a.createdAt), a.actorName, `${a.text}${a.taskTitle ? ` — ${a.taskTitle}` : ""}`]),
      }}
    >
      {data.activity.length === 0 ? (
        <p className="py-6 text-center text-body-sm text-text-muted">
          Nothing happened in this range.
        </p>
      ) : (
        <ul className="flex max-h-72 flex-col gap-2.5 overflow-y-auto">
          {data.activity.map((entry) => {
            const Icon = ICON[entry.kind] ?? Activity;
            return (
              <li key={entry.id} className="flex min-w-0 items-start gap-2.5">
                <span
                  className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-elevated text-text-muted"
                  aria-hidden="true"
                >
                  <Icon className="size-3" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-body-sm leading-[18px] text-text-secondary">
                    <span className="font-medium text-text-primary">{entry.actorName.split(" ")[0]}</span>{" "}
                    {entry.text}
                    {entry.taskTitle && (
                      <>
                        {" — "}
                        {entry.projectSlug ? (
                          <Link
                            href={`/projects/${entry.projectSlug}`}
                            className="text-primary hover:underline"
                          >
                            {entry.taskTitle}
                          </Link>
                        ) : (
                          entry.taskTitle
                        )}
                      </>
                    )}
                  </span>
                  <span className="mt-0.5 block text-caption tabular text-text-muted">
                    {formatRelative(entry.createdAt)}
                    {entry.detail ? ` · ${entry.detail}` : ""}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </ChartFrame>
  );
}
