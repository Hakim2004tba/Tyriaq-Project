import type { JSX } from "react";
import { AlertTriangle, Info } from "lucide-react";
import { cn } from "@flow/utils";
import { AdminPage, PageHeader, SampleDataNote } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { AUDIT, RECENT_ERRORS, SERVICES, formatWhen } from "@/lib/data/admin-sample";

export const metadata = { title: "System" };

export default function AdminSystemPage(): JSX.Element {
  const degraded = SERVICES.filter((s) => s.state !== "operational");

  return (
    <AdminPage>
      <PageHeader
        title="System"
        subtitle="Service health, background work and recent errors"
      />

      {/*
        The banner leads with the exception, not the summary. "5 of 6
        operational" is a number nobody acts on; "storage is degraded" is.
      */}
      {degraded.length > 0 ? (
        <div className="flex items-start gap-2.5 rounded-lg border border-warning/40 bg-warning-subtle px-3 py-2.5">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          <p className="min-w-0 text-body-sm text-text-primary">
            {degraded.map((s) => s.name).join(", ")}{" "}
            {degraded.length === 1 ? "is" : "are"} degraded —{" "}
            <span className="text-text-secondary">{degraded[0]!.detail.toLowerCase()}</span>.
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 rounded-lg border border-success/40 bg-success-subtle px-3 py-2.5">
          <Info className="size-4 shrink-0 text-success" aria-hidden="true" />
          <p className="text-body-sm text-text-primary">Everything is operational.</p>
        </div>
      )}

      <SampleDataNote />

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {SERVICES.map((service) => (
          <li
            key={service.id}
            className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4 shadow-card"
          >
            <div className="flex items-start justify-between gap-2">
              <h2 className="truncate text-body font-medium text-text-primary">{service.name}</h2>
              <StatusBadge status={service.state} />
            </div>
            <p className="text-body-sm text-text-secondary">{service.detail}</p>
            <dl className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-2.5 text-caption">
              <div>
                <dt className="text-text-muted">Uptime (30 d)</dt>
                <dd className="tabular text-text-primary">{service.uptime}</dd>
              </div>
              <div className="text-right">
                <dt className="text-text-muted">Latency</dt>
                <dd
                  className={cn(
                    "tabular",
                    service.latencyMs > 300 ? "text-warning" : "text-text-primary"
                  )}
                >
                  {service.latencyMs} ms
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="min-w-0 rounded-xl border border-border bg-surface p-4 shadow-card">
          <h2 className="mb-3 text-body font-medium text-text-primary">Recent errors</h2>
          <ul className="flex flex-col divide-y divide-border">
            {RECENT_ERRORS.map((error) => (
              <li key={error.id} className="flex items-start gap-2.5 py-2.5">
                <span
                  className={cn(
                    "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
                    error.level === "error"
                      ? "bg-danger-subtle text-danger"
                      : "bg-warning-subtle text-warning"
                  )}
                  aria-hidden="true"
                >
                  <AlertTriangle className="size-3" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body-sm text-text-primary">{error.message}</span>
                  <span className="block truncate text-caption text-text-muted">
                    {error.service} · {formatWhen(error.at)}
                  </span>
                </span>
                <span className="shrink-0 rounded-md bg-surface-elevated px-1.5 py-0.5 text-caption tabular text-text-secondary">
                  ×{error.count}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="min-w-0 rounded-xl border border-border bg-surface p-4 shadow-card">
          <h2 className="mb-3 text-body font-medium text-text-primary">System activity</h2>
          <ul className="flex flex-col divide-y divide-border">
            {AUDIT.filter((a) => a.kind === "system" || a.result !== "success")
              .slice(0, 6)
              .map((entry) => (
                <li key={entry.id} className="flex items-start gap-2.5 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body-sm text-text-primary">{entry.action}</span>
                    <span className="block truncate text-caption text-text-muted">
                      {entry.target} · {entry.admin}
                    </span>
                  </span>
                  <StatusBadge status={entry.result} />
                </li>
              ))}
          </ul>
        </section>
      </div>
    </AdminPage>
  );
}
