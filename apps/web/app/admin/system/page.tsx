import type { JSX } from "react";
import { AlertTriangle, Info } from "lucide-react";
import { AdminPage, PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { getSystemHealth } from "@/lib/data/admin";

export const metadata = { title: "System" };

/**
 * What can actually be measured from inside this process.
 *
 * The previous version drew six services with uptime percentages, p95
 * latencies and a list of recent errors — all invented. None of it was
 * reachable from here: this is a serverless function that can talk to
 * the database and read its own environment, and nothing else.
 *
 * So the page answers only what it can: is the database reachable and
 * how fast, how much is stored in it, and which optional pieces are
 * configured. Everything removed was a number that would have been read
 * as fact.
 */
export default async function AdminSystemPage(): Promise<JSX.Element> {
  const health = await getSystemHealth();

  const checks = [
    {
      name: "Database",
      detail: health?.databaseReachable
        ? `Answered in ${health.latencyMs} ms`
        : "Could not be reached from this request",
      state: health?.databaseReachable ? "operational" : "down",
    },
    {
      name: "Back-office access",
      detail: health?.serviceRoleConfigured
        ? "Service-role key present"
        : "SUPABASE_SERVICE_ROLE_KEY is missing — this panel cannot read platform data",
      state: health?.serviceRoleConfigured ? "operational" : "down",
    },
    {
      name: "Email",
      detail: health?.mailConfigured
        ? "RESEND_API_KEY present"
        : "No provider — mail is written to the log instead of sent",
      state: health?.mailConfigured ? "operational" : "degraded",
    },
    {
      name: "Daily digest",
      detail: health?.cronConfigured
        ? "CRON_SECRET present; runs at 07:00 UTC"
        : "No CRON_SECRET — the scheduled run is unauthenticated",
      state: health?.cronConfigured ? "operational" : "degraded",
    },
  ] as const;

  const unwell = checks.filter((check) => check.state !== "operational");

  return (
    <AdminPage>
      <PageHeader title="System" subtitle="What this deployment can and cannot do" />

      {/*
        The banner leads with the exception, not the summary. "3 of 4
        operational" is a number nobody acts on; "email is not
        configured" is.
      */}
      {unwell.length > 0 ? (
        <div className="flex items-start gap-2.5 rounded-lg border border-warning/40 bg-warning-subtle px-3 py-2.5">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          <p className="min-w-0 text-body-sm text-text-primary">
            {unwell.map((check) => check.name).join(", ")}{" "}
            {unwell.length === 1 ? "needs" : "need"} attention —{" "}
            <span className="text-text-secondary">{unwell[0]!.detail}</span>.
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 rounded-lg border border-success/40 bg-success-subtle px-3 py-2.5">
          <Info className="size-4 shrink-0 text-success" aria-hidden="true" />
          <p className="text-body-sm text-text-primary">Everything this page can check is fine.</p>
        </div>
      )}

      <ul className="grid gap-3 sm:grid-cols-2">
        {checks.map((check) => (
          <li
            key={check.name}
            className="flex items-start gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-card"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-body-sm font-medium text-text-primary">{check.name}</span>
              <span className="mt-0.5 block text-caption text-text-muted">{check.detail}</span>
            </span>
            <StatusBadge status={check.state} />
          </li>
        ))}
      </ul>

      <section className="rounded-xl border border-border bg-surface p-4 shadow-card">
        <h2 className="text-body font-medium text-text-primary">What is in the database</h2>
        <p className="mt-0.5 text-caption text-text-muted">
          Counted now, across every workspace.
        </p>
        <ul className="mt-3 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {(health?.rows ?? []).map((row) => (
            <li key={row.table} className="rounded-lg border border-border bg-surface-muted px-3 py-2.5">
              <p className="text-caption capitalize text-text-muted">{row.table}</p>
              <p className="mt-0.5 text-h4 tabular text-text-primary">
                {row.count.toLocaleString()}
              </p>
            </li>
          ))}
          <li className="rounded-lg border border-border bg-surface-muted px-3 py-2.5">
            <p className="text-caption text-text-muted">Attachments</p>
            <p className="mt-0.5 text-h4 tabular text-text-primary">
              {(health?.storageMb ?? 0).toLocaleString()} MB
            </p>
          </li>
        </ul>
      </section>

      <p className="text-caption text-text-muted">
        Uptime history, request latency and error tracking are not here because this process cannot
        measure them. They belong to the hosting dashboard and to whatever error tracker gets
        added — a graph drawn from numbers this page made up would be read as fact.
      </p>
    </AdminPage>
  );
}
