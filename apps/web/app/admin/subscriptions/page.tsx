import type { JSX } from "react";
import { AdminPage, PageHeader, SampleDataNote } from "@/components/admin/page-header";
import { ChartFrame } from "@/components/reports/charts/chart-frame";
import { DonutChart } from "@/components/reports/charts/donut-chart";
import { CATEGORICAL } from "@/components/reports/charts/palette";
import { SubscriptionsTable } from "./subscriptions-table";
import { PLANS, SUBSCRIPTIONS, formatMoney } from "@/lib/data/admin-sample";

export const metadata = { title: "Subscriptions" };

export default function AdminSubscriptionsPage(): JSX.Element {
  const by = (status: string) => SUBSCRIPTIONS.filter((s) => s.status === status);
  const active = by("active");

  // Yearly plans are divided down so the figure means the same thing for
  // every row — a yearly subscription is not twelve times the revenue of
  // a monthly one in any given month.
  const mrr = active.reduce((n, s) => n + (s.cycle === "yearly" ? s.amount / 12 : s.amount), 0);

  const cards = [
    { label: "Active", value: active.length, tone: "text-success" },
    { label: "Trials", value: by("trialing").length, tone: "text-info" },
    { label: "Past due", value: by("past_due").length, tone: "text-warning" },
    { label: "Cancelled", value: by("cancelled").length, tone: "text-danger" },
    { label: "MRR", value: formatMoney(Math.round(mrr)), tone: "text-text-primary" },
  ];

  return (
    <AdminPage>
      <PageHeader title="Subscriptions" subtitle="Billing across every workspace" />
      <SampleDataNote />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <ul className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {cards.map((card) => (
            <li
              key={card.label}
              className="rounded-xl border border-border bg-surface px-3.5 py-3 shadow-card"
            >
              <p className="truncate text-caption text-text-muted">{card.label}</p>
              <p className={`mt-1 text-h2 tabular ${card.tone}`}>{card.value}</p>
            </li>
          ))}
        </ul>

        <section className="rounded-xl border border-border bg-surface p-4 shadow-card xl:row-span-2">
          <ChartFrame
            title="Plans"
            subtitle="Share of paying subscriptions"
            table={{ columns: ["Plan", "Subscribers"], rows: PLANS.map((p) => [p.name, p.subscribers]) }}
          >
            <DonutChart
              slices={PLANS.map((plan, i) => ({
                key: plan.id,
                label: plan.name,
                value: plan.subscribers,
                color: CATEGORICAL[i] ?? "#5B5570",
              }))}
              centerLabel="subscribers"
              centerValue={PLANS.reduce((n, p) => n + p.subscribers, 0).toLocaleString()}
              size={150}
            />
          </ChartFrame>
        </section>

        <div className="min-w-0 xl:col-start-1">
          <SubscriptionsTable subscriptions={SUBSCRIPTIONS} />
        </div>
      </div>
    </AdminPage>
  );
}
