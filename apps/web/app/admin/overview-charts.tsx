"use client";

import { ChartFrame } from "@/components/reports/charts/chart-frame";
import { DonutChart } from "@/components/reports/charts/donut-chart";
import { LineChart } from "@/components/reports/charts/line-chart";
import { CATEGORICAL } from "@/components/reports/charts/palette";
import {
  KPIS,
  PLANS,
  REVENUE_SERIES,
  SUBSCRIPTION_SERIES,
  USER_SERIES,
  formatMoney,
} from "@/lib/data/admin-sample";

/**
 * The overview's charts.
 *
 * A client component because the charts take formatter FUNCTIONS, and a
 * function cannot cross the server/client boundary as a prop. Keeping
 * the page itself on the server means it still exports metadata and
 * renders its lists without shipping them.
 */
export function GrowthChart() {
  const labels = USER_SERIES.map((p) => p.date);

  return (
    <ChartFrame
      title="Users and revenue"
      subtitle="Last 30 days"
      legend={[
        { label: "Users", color: CATEGORICAL[2] },
        { label: "Revenue (USD)", color: CATEGORICAL[1] },
      ]}
      table={{
        columns: ["Date", "Users", "Revenue"],
        rows: labels.map((date, i) => [date, USER_SERIES[i]!.value, formatMoney(REVENUE_SERIES[i]!.value)]),
      }}
    >
      {/*
        Two measures of very different magnitude on ONE scale would flatten
        the smaller into the axis, and a second y-axis lets a designer make
        any two lines cross wherever they like. Revenue is scaled onto the
        same footing instead — the shapes stay comparable, and the tooltip
        and the table carry the real figures.
      */}
      <LineChart
        labels={labels}
        series={[
          { key: "users", label: "Users", color: CATEGORICAL[2], values: USER_SERIES.map((p) => p.value) },
          {
            key: "revenue",
            label: "Revenue",
            color: CATEGORICAL[1],
            values: REVENUE_SERIES.map((p) => Math.round(p.value / 6)),
          },
        ]}
        height={240}
        formatValue={(n) => n.toLocaleString()}
      />
    </ChartFrame>
  );
}

export function PlanDonut() {
  return (
    <ChartFrame
      title="Plan distribution"
      subtitle={`${KPIS.subscriptions.value.toLocaleString()} active subscriptions`}
      table={{ columns: ["Plan", "Subscribers"], rows: PLANS.map((p) => [p.name, p.subscribers]) }}
    >
      <DonutChart
        slices={PLANS.map((plan, i) => ({
          key: plan.id,
          label: plan.name,
          value: plan.subscribers,
          color: CATEGORICAL[i] ?? "#5B5570",
        }))}
        centerLabel="subscriptions"
        centerValue={PLANS.reduce((n, p) => n + p.subscribers, 0).toLocaleString()}
      />
    </ChartFrame>
  );
}

export function SubscriptionChart() {
  return (
    <ChartFrame
      title="Subscription growth"
      subtitle="Paid subscriptions, last 30 days"
      table={{
        columns: ["Date", "Subscriptions"],
        rows: SUBSCRIPTION_SERIES.map((p) => [p.date, p.value]),
      }}
    >
      <LineChart
        labels={SUBSCRIPTION_SERIES.map((p) => p.date)}
        series={[
          {
            key: "subs",
            label: "Subscriptions",
            color: CATEGORICAL[5],
            values: SUBSCRIPTION_SERIES.map((p) => p.value),
          },
        ]}
        height={190}
      />
    </ChartFrame>
  );
}
