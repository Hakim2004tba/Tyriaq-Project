import type { ReactNode } from "react";

/** One heading treatment for every operations page. */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-h1 text-text-primary">{title}</h1>
        <p className="mt-1 text-body-sm text-text-secondary">{subtitle}</p>
      </div>
      {action}
    </header>
  );
}

export function AdminPage({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
      {children}
    </div>
  );
}

/**
 * The prototype notice.
 *
 * Said once per page, quietly. Every table here is sample data, and an
 * operations screen that looks live but is not is the kind of thing
 * somebody makes a decision on.
 */
export function SampleDataNote({ children }: { children?: ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-border-strong bg-surface-muted px-3 py-2 text-caption text-text-muted">
      {children ??
        "Sample data. The admin panel is not connected to a backend in this phase — actions confirm and report, but change nothing."}
    </p>
  );
}
