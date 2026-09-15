import type { JSX } from "react";
import Link from "next/link";
import {
  Building2,
  CreditCard,
  DollarSign,
  UserMinus,
  UserPlus,
  Users,
  UserCheck,
} from "lucide-react";
import { Avatar } from "@flow/ui";
import { AdminPage, PageHeader, SampleDataNote } from "@/components/admin/page-header";
import { PlanBadge, StatusBadge } from "@/components/admin/status-badge";
import { GrowthChart, PlanDonut, WorkspaceChart } from "./overview-charts";
import { formatMoney, formatWhen } from "@/lib/data/admin-sample";
import {
  getAdminAudit,
  getAdminOverview,
  getAdminUsers,
  getAdminWorkspaces,
  getSystemHealth,
} from "@/lib/data/admin";

export const metadata = { title: "Overview" };

interface KpiCard {
  label: string;
  icon: typeof Users;
  value: number;
  format: (n: number) => string;
}

export default async function AdminOverview(): Promise<JSX.Element> {
  const [overview, users, workspaces, audit, health] = await Promise.all([
    getAdminOverview(),
    getAdminUsers(),
    getAdminWorkspaces(),
    getAdminAudit(),
    getSystemHealth(),
  ]);

  /*
    No month-on-month arrows.

    The sample data carried a "previous" figure for every number, and
    computing a real one means keeping history this schema does not keep
    — a count of users a month ago cannot be recovered from a table of
    users that exist now. A green arrow with a made-up denominator is
    worse than no arrow, so the cards state the figure and stop.
  */
  const KPI_CARDS: KpiCard[] = [
    { label: "Total users", icon: Users, value: overview?.totalUsers ?? 0, format: (n) => n.toLocaleString() },
    { label: "Active users", icon: UserCheck, value: overview?.activeUsers ?? 0, format: (n) => n.toLocaleString() },
    { label: "Workspaces", icon: Building2, value: overview?.workspaces ?? 0, format: (n) => n.toLocaleString() },
    { label: "Subscriptions", icon: CreditCard, value: overview?.subscriptions ?? 0, format: (n) => n.toLocaleString() },
    { label: "MRR", icon: DollarSign, value: overview?.mrr ?? 0, format: formatMoney },
    { label: "New users", icon: UserPlus, value: overview?.newUsers ?? 0, format: (n) => n.toLocaleString() },
    { label: "Churned", icon: UserMinus, value: overview?.churned ?? 0, format: (n) => n.toLocaleString() },
  ];

  const recentUsers = [...(users ?? [])]
    .sort((a, b) => b.joined.localeCompare(a.joined))
    .slice(0, 5);
  const recentWorkspaces = [...(workspaces ?? [])]
    .sort((a, b) => b.created.localeCompare(a.created))
    .slice(0, 5);

  return (
    <AdminPage>
      <PageHeader
        title="Overview"
        subtitle={`Platform-wide, updated ${formatWhen(new Date().toISOString())}`}
      />
      {!overview && (
        <SampleDataNote>
          SUPABASE_SERVICE_ROLE_KEY is not set, so these figures cannot be read. Every number below
          is zero rather than invented.
        </SampleDataNote>
      )}

      {/* ----------------------------- KPI row ---------------------------- */}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {KPI_CARDS.map((kpi) => {
          const Icon = kpi.icon;
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
            </li>
          );
        })}
      </ul>

      {/* ----------------------------- charts ----------------------------- */}
      <div className="grid gap-4 xl:grid-cols-3">
        <section className="rounded-xl border border-border bg-surface p-4 shadow-card xl:col-span-2">
          <GrowthChart
            users={overview?.userSeries ?? []}
            workspaces={overview?.workspaceSeries ?? []}
          />
        </section>
        <section className="rounded-xl border border-border bg-surface p-4 shadow-card">
          <PlanDonut distribution={overview?.planDistribution ?? []} />
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="rounded-xl border border-border bg-surface p-4 shadow-card xl:col-span-2">
          <WorkspaceChart workspaces={overview?.workspaceSeries ?? []} />
        </section>

        {/* ---------------------------- system --------------------------- */}
        <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-card">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-body font-medium text-text-primary">System status</h2>
            <Link href="/admin/system" className="text-caption text-primary hover:underline">
              Details
            </Link>
          </div>
          {/*
            What can be measured from here, and nothing else. Uptime
            percentages and CPU graphs were sample data: this process has
            no way to know either, and a dial reading 99.98% because
            somebody typed it is worse than no dial.
          */}
          <ul className="flex flex-col gap-2">
            {[
              {
                name: "Database",
                detail: health?.databaseReachable ? `${health.latencyMs} ms` : "unreachable",
                state: health?.databaseReachable ? "operational" : "down",
              },
              {
                name: "Email",
                detail: health?.mailConfigured ? "provider configured" : "not configured",
                state: health?.mailConfigured ? "operational" : "degraded",
              },
              {
                name: "Daily digest",
                detail: health?.cronConfigured ? "scheduled" : "no CRON_SECRET",
                state: health?.cronConfigured ? "operational" : "degraded",
              },
              {
                name: "Back-office access",
                detail: health?.serviceRoleConfigured ? "service role present" : "key missing",
                state: health?.serviceRoleConfigured ? "operational" : "down",
              },
            ].map((service) => (
              <li key={service.name} className="flex items-center gap-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body-sm text-text-primary">{service.name}</span>
                  <span className="block truncate text-caption text-text-muted">{service.detail}</span>
                </span>
                <StatusBadge status={service.state as "operational" | "degraded" | "down"} />
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
            {recentUsers.map((user) => (
              <li key={user.id} className="flex items-center gap-2.5 py-2">
                <Avatar name={user.name} src={undefined} size="sm" />
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
            {recentWorkspaces.map((workspace) => (
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
            {(audit ?? []).slice(0, 5).map((entry) => (
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
