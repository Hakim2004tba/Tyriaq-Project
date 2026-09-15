"use client";

import { ChartFrame } from "@/components/reports/charts/chart-frame";
import { DonutChart } from "@/components/reports/charts/donut-chart";
import { LineChart } from "@/components/reports/charts/line-chart";
import { CATEGORICAL } from "@/components/reports/charts/palette";
import { PLAN_META, type PlanId } from "@/lib/data/admin-sample";

/** A point on a growth line: a day, and the running total that day. */
export interface SeriesPoint {
  date: string;
  value: number;
}

/**
 * The overview's charts.
 *
 * A client component because the charts take formatter FUNCTIONS, and a
 * function cannot cross the server/client boundary as a prop. Keeping
 * the page itself on the server means it still exports metadata and
 * renders its lists without shipping them.
 */
/**
 * People and workspaces over time.
 *
 * Both are counts of the same kind of thing, so they share one scale
 * honestly — which the previous version could not do: it drew users
 * against revenue, two quantities with no common unit, and scaled one of
 * them by a made-up divisor to make the lines sit together.
 */
export function GrowthChart({
  users,
  workspaces,
}: {
  users: SeriesPoint[];
  workspaces: SeriesPoint[];
}) {
  const labels = users.map((point) => point.date);

  return (
    <ChartFrame
      title="Users and workspaces"
      subtitle={`Last ${Math.max(labels.length - 1, 0)} days`}
      legend={[
        { label: "Users", color: CATEGORICAL[2] },
        { label: "Workspaces", color: CATEGORICAL[1] },
      ]}
      table={{
        columns: ["Date", "Users", "Workspaces"],
        rows: labels.map((date, i) => [date, users[i]?.value ?? 0, workspaces[i]?.value ?? 0]),
      }}
    >
      <LineChart
        labels={labels}
        series={[
          { key: "users", label: "Users", color: CATEGORICAL[2], values: users.map((p) => p.value) },
          {
            key: "workspaces",
            label: "Workspaces",
            color: CATEGORICAL[1],
            values: workspaces.map((p) => p.value),
          },
        ]}
        height={240}
        formatValue={(n) => n.toLocaleString()}
      />
    </ChartFrame>
  );
}

export function PlanDonut({
  distribution,
}: {
  distribution: { plan: PlanId; count: number }[];
}) {
  const total = distribution.reduce((sum, slice) => sum + slice.count, 0);

  return (
    <ChartFrame
      title="Plan distribution"
      subtitle={`${total.toLocaleString()} ${total === 1 ? "workspace" : "workspaces"}`}
      table={{
        columns: ["Plan", "Workspaces"],
        rows: distribution.map((slice) => [PLAN_META[slice.plan]?.label ?? slice.plan, slice.count]),
      }}
    >
      <DonutChart
        slices={distribution.map((slice, i) => ({
          key: slice.plan,
          label: PLAN_META[slice.plan]?.label ?? slice.plan,
          value: slice.count,
          color: CATEGORICAL[i] ?? "#5B5570",
        }))}
        centerLabel={total === 1 ? "workspace" : "workspaces"}
        centerValue={total.toLocaleString()}
      />
    </ChartFrame>
  );
}

export function WorkspaceChart({ workspaces }: { workspaces: SeriesPoint[] }) {
  return (
    <ChartFrame
      title="Workspace growth"
      subtitle={`Workspaces created, last ${Math.max(workspaces.length - 1, 0)} days`}
      table={{
        columns: ["Date", "Workspaces"],
        rows: workspaces.map((point) => [point.date, point.value]),
      }}
    >
      <LineChart
        labels={workspaces.map((point) => point.date)}
        series={[
          {
            key: "workspaces",
            label: "Workspaces",
            color: CATEGORICAL[5],
            values: workspaces.map((point) => point.value),
          },
        ]}
        height={190}
      />
    </ChartFrame>
  );
}
