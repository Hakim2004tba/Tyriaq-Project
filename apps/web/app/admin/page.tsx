import type { JSX } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  CreditCard,
  DollarSign,
  UserMinus,
  UserPlus,
  Users,
  UserCheck,
} from "lucide-react";
import { Avatar } from "@flow/ui";
import { cn } from "@flow/utils";
import { AdminPage, PageHeader, SampleDataNote } from "@/components/admin/page-header";
import { PlanBadge, StatusBadge } from "@/components/admin/status-badge";
import { GrowthChart, PlanDonut, SubscriptionChart } from "./overview-charts";
import {
  AUDIT,
  KPIS,
  SERVICES,
  USERS,
  WORKSPACES,
  formatMoney,
  formatWhen,
} from "@/lib/data/admin-sample";

export const metadata = { title: "Overview" };

interface KpiCard {
  label: string;
  icon: typeof Users;
  value: number;
  previous: number;
  format: (n: number) => string;
  /** True where down is the good direction — churn, not signups. */
  invert?: boolean;
}

const KPI_CARDS: KpiCard[] = [
  { label: "Total users", icon: Users, ...KPIS.totalUsers, format: (n: number) => n.toLocaleString() },
  { label: "Active users", icon: UserCheck, ...KPIS.activeUsers, format: (n: number) => n.toLocaleString() },
  { label: "Workspaces", icon: Building2, ...KPIS.workspaces, format: (n: number) => n.toLocaleString() },
  { label: "Active subscriptions", icon: CreditCard, ...KPIS.subscriptions, format: (n: number) => n.toLocaleString() },
  { label: "MRR", icon: DollarSign, ...KPIS.mrr, format: formatMoney },
  { label: "New users", icon: UserPlus, ...KPIS.newUsers, format: (n: number) => n.toLocaleString() },
  { label: "Churned", icon: UserMinus, ...KPIS.churned, format: (n: number) => n.toLocaleString(), invert: true },
];

export default function AdminOverview(): JSX.Element {
  return (
    <AdminPage>
      <PageHeader
        title="Overview"
        subtitle={`Platform-wide, updated ${formatWhen(new Date().toISOString())}`}
      />
      <SampleDataNote />

      {/* ----------------------------- KPI row ---------------------------- */}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {KPI_CARDS.map((kpi) => {
          const Icon = kpi.icon;
          const delta = kpi.previous === 0 ? 0 : Math.round(((kpi.value - kpi.previous) / kpi.previous) * 100);
          const good = kpi.invert ? delta <= 0 : delta >= 0;
          return (
            <li
              key={kpi.label}
              className="flex min-w-0 flex-col gap-1.5 rounded-xl border border-border bg-surface px-3.5 py-3 shadow-card"
            >
              <span className="flex items-center gap-2">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary-muted text-primary">
                  <Icon className="size-3.5" />
                </span>
                <span className="truncate text-caption text-text-muted">{kpi.label}</span>
              </span>
              <span className="text-h2 tabular text-text-primary">{kpi.format(kpi.value)}</span>
              <span className={cn("flex items-center gap-1 text-caption", good ? "text-success" : "text-danger")}>
                <ArrowUpRight className={cn("size-3 shrink-0", delta < 0 && "rotate-90")} aria-hidden="true" />
                {delta > 0 ? "+" : ""}
                {delta}% this month
              </span>
            </li>
          );
        })}
      </ul>

      {/* ----------------------------- charts ----------------------------- */}
      <div className="grid gap-4 xl:grid-cols-3">
        <section className="rounded-xl border border-border bg-surface p-4 shadow-card xl:col-span-2">
          <GrowthChart />
        </section>
        <section className="rounded-xl border border-border bg-surface p-4 shadow-card">
          <PlanDonut />
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="rounded-xl border border-border bg-surface p-4 shadow-card xl:col-span-2">
          <SubscriptionChart />
        </section>

        {/* ---------------------------- system --------------------------- */}
        <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-card">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-body font-medium text-text-primary">System status</h2>
            <Link href="/admin/system" className="text-caption text-primary hover:underline">
              Details
            </Link>
          </div>
          <ul className="flex flex-col gap-2">
            {SERVICES.slice(0, 5).map((service) => (
              <li key={service.id} className="flex items-center gap-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body-sm text-text-primary">{service.name}</span>
                  <span className="block truncate text-caption text-text-muted">{service.detail}</span>
                </span>
                <span className="shrink-0 text-caption tabular text-text-muted">{service.uptime}</span>
                <StatusBadge status={service.state} />
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* ------------------------- three recent lists ---------------------- */}
      <div className="grid gap-4 xl:grid-cols-3">
        <section className="min-w-0 rounded-xl border border-border bg-surface p-4 shadow-card">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-body font-medium text-text-primary">Recent signups</h2>
            <Link href="/admin/users" className="text-caption text-primary hover:underline">
              See all
            </Link>
          </div>
          <ul className="flex flex-col divide-y divide-border">
            {USERS.slice(0, 5).map((user) => (
              <li key={user.id} className="flex items-center gap-2.5 py-2">
                <Avatar name={user.name} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body-sm text-text-primary">{user.name}</span>
                  <span className="block truncate text-caption text-text-muted">{user.email}</span>
                </span>
                <PlanBadge plan={user.plan} />
              </li>
            ))}
          </ul>
        </section>

        <section className="min-w-0 rounded-xl border border-border bg-surface p-4 shadow-card">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-body font-medium text-text-primary">Recent workspaces</h2>
            <Link href="/admin/workspaces" className="text-caption text-primary hover:underline">
              See all
            </Link>
          </div>
          <ul className="flex flex-col divide-y divide-border">
            {WORKSPACES.slice(0, 5).map((workspace) => (
              <li key={workspace.id} className="flex items-center gap-2.5 py-2">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-surface-elevated text-caption font-semibold text-text-secondary ring-1 ring-inset ring-border">
                  {workspace.name.slice(0, 1)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body-sm text-text-primary">{workspace.name}</span>
                  <span className="block truncate text-caption text-text-muted">
                    {workspace.ownerName} · {workspace.members} members
                  </span>
                </span>
                <PlanBadge plan={workspace.plan} />
              </li>
            ))}
          </ul>
        </section>

        <section className="min-w-0 rounded-xl border border-border bg-surface p-4 shadow-card">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-body font-medium text-text-primary">Recent admin activity</h2>
            <Link href="/admin/audit" className="text-caption text-primary hover:underline">
              See all
            </Link>
          </div>
          <ul className="flex flex-col divide-y divide-border">
            {AUDIT.slice(0, 5).map((entry) => (
              <li key={entry.id} className="flex items-start gap-2.5 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body-sm text-text-primary">{entry.action}</span>
                  <span className="block truncate text-caption text-text-muted">
                    {entry.target} · {entry.admin}
                  </span>
                </span>
                <span className="shrink-0 text-caption text-text-muted">{formatWhen(entry.at)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AdminPage>
  );
}
