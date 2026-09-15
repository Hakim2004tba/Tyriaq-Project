"use client";

import { BarChart } from "@/components/reports/charts/bar-chart";
import { ChartFrame } from "@/components/reports/charts/chart-frame";
import { LineChart } from "@/components/reports/charts/line-chart";
import { CATEGORICAL, categorical } from "@/components/reports/charts/palette";
import { formatStorage, type AdminWorkspace } from "@/lib/data/admin-sample";
import type { SeriesPoint } from "../overview-charts";

/** Client-side for the same reason as the overview: formatter functions. */
export function AnalyticsCharts({
  users,
  workspacesOverTime,
  workspaces,
}: {
  users: SeriesPoint[];
  workspacesOverTime: SeriesPoint[];
  workspaces: AdminWorkspace[];
}) {
  const byStorage = [...workspaces].sort((a, b) => b.storageMb - a.storageMb).slice(0, 8);
  const byTasks = [...workspaces].sort((a, b) => b.tasks - a.tasks).slice(0, 8);

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <section className="rounded-xl border border-border bg-surface p-4 shadow-card">
        <ChartFrame
          title="User growth"
          subtitle="Last 30 days"
          table={{ columns: ["Date", "Users"], rows: users.map((p) => [p.date, p.value]) }}
        >
          <LineChart
            labels={users.map((p) => p.date)}
            series={[{ key: "users", label: "Users", color: CATEGORICAL[2], values: users.map((p) => p.value) }]}
            height={200}
            formatValue={(n) => n.toLocaleString()}
          />
        </ChartFrame>
      </section>

      <section className="rounded-xl border border-border bg-surface p-4 shadow-card">
        <ChartFrame
          title="Workspace growth"
          subtitle="Last 30 days"
          table={{
            columns: ["Date", "Workspaces"],
            rows: workspacesOverTime.map((p) => [p.date, p.value]),
          }}
        >
          <LineChart
            labels={workspacesOverTime.map((p) => p.date)}
            series={[
              {
                key: "workspaces",
                label: "Workspaces",
                color: CATEGORICAL[1],
                values: workspacesOverTime.map((p) => p.value),
              },
            ]}
            height={200}
            formatValue={(n) => n.toLocaleString()}
          />
        </ChartFrame>
      </section>

      <section className="rounded-xl border border-border bg-surface p-4 shadow-card">
        <ChartFrame
          title="Storage by workspace"
          subtitle="The accounts driving storage cost"
          table={{ columns: ["Workspace", "Storage"], rows: byStorage.map((w) => [w.name, formatStorage(w.storageMb)]) }}
        >
          <BarChart
            bars={byStorage.map((w, i) => ({
              key: w.id,
              label: w.name,
              value: w.storageMb,
              color: categorical(i),
              detail: w.storageLimitMb
                ? `${Math.round((w.storageMb / w.storageLimitMb) * 100)}% of their limit`
                : "Unlimited plan",
            }))}
            formatValue={formatStorage}
          />
        </ChartFrame>
      </section>

      <section className="rounded-xl border border-border bg-surface p-4 shadow-card">
        <ChartFrame
          title="Tasks by workspace"
          subtitle="Where the product is actually used"
          table={{ columns: ["Workspace", "Tasks"], rows: byTasks.map((w) => [w.name, w.tasks]) }}
        >
          <BarChart
            bars={byTasks.map((w, i) => ({
              key: w.id,
              label: w.name,
              value: w.tasks,
              color: categorical(i),
              detail: `${w.members} members · ${w.projects} projects`,
            }))}
            formatValue={(n) => n.toLocaleString()}
          />
        </ChartFrame>
      </section>
    </div>
  );
}
