"use client";

import { BarChart } from "@/components/reports/charts/bar-chart";
import { ChartFrame } from "@/components/reports/charts/chart-frame";
import { LineChart } from "@/components/reports/charts/line-chart";
import { CATEGORICAL, categorical } from "@/components/reports/charts/palette";
import {
  REVENUE_SERIES,
  USER_SERIES,
  WORKSPACES,
  formatMoney,
  formatStorage,
} from "@/lib/data/admin-sample";

/** Client-side for the same reason as the overview: formatter functions. */
export function AnalyticsCharts() {
  const byStorage = [...WORKSPACES].sort((a, b) => b.storageMb - a.storageMb).slice(0, 8);
  const byTasks = [...WORKSPACES].sort((a, b) => b.tasks - a.tasks).slice(0, 8);

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <section className="rounded-xl border border-border bg-surface p-4 shadow-card">
        <ChartFrame
          title="User growth"
          subtitle="Last 30 days"
          table={{ columns: ["Date", "Users"], rows: USER_SERIES.map((p) => [p.date, p.value]) }}
        >
          <LineChart
            labels={USER_SERIES.map((p) => p.date)}
            series={[{ key: "users", label: "Users", color: CATEGORICAL[2], values: USER_SERIES.map((p) => p.value) }]}
            height={200}
            formatValue={(n) => n.toLocaleString()}
          />
        </ChartFrame>
      </section>

      <section className="rounded-xl border border-border bg-surface p-4 shadow-card">
        <ChartFrame
          title="Revenue"
          subtitle="Last 30 days, USD"
          table={{ columns: ["Date", "Revenue"], rows: REVENUE_SERIES.map((p) => [p.date, formatMoney(p.value)]) }}
        >
          <LineChart
            labels={REVENUE_SERIES.map((p) => p.date)}
            series={[{ key: "rev", label: "Revenue", color: CATEGORICAL[1], values: REVENUE_SERIES.map((p) => p.value) }]}
            height={200}
            formatValue={formatMoney}
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
