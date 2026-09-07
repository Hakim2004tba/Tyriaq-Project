import * as React from "react";
import { Zap, Plus } from "lucide-react";
import type { Automation, AutomationRun } from "@flow/types";
import { Button } from "../button/button";
import { EmptyState } from "../empty-state/empty-state";
import { Skeleton } from "../skeleton/skeleton";
import { AutomationCard } from "../automation-card/automation-card";

export type AutomationFilter = "all" | "active" | "inactive";

export interface AutomationListProps {
  automations: Automation[];
  runs: AutomationRun[];
  loading?: boolean;
  error?: string | null;
  canManage: boolean;
  resolveUserName: (userId: string) => string;
  onCreate: () => void;
  onEdit: (automation: Automation) => void;
  onDelete: (automation: Automation) => void;
  onToggleEnabled: (automation: Automation, enabled: boolean) => void;
}

/** The full Automations surface for a project: filter pills, cards,
 * and every state the brief calls for explicitly (empty/loading/
 * error). Run counts are derived here from the already-fetched `runs`
 * array — one query for all automations' runs, never one per card. */
export function AutomationList({
  automations,
  runs,
  loading,
  error,
  canManage,
  resolveUserName,
  onCreate,
  onEdit,
  onDelete,
  onToggleEnabled,
}: AutomationListProps) {
  const [filter, setFilter] = React.useState<AutomationFilter>("all");

  const runCountByAutomation = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const run of runs) map.set(run.automationId, (map.get(run.automationId) ?? 0) + 1);
    return map;
  }, [runs]);

  const activeCount = automations.filter((a) => a.enabled).length;
  const inactiveCount = automations.length - activeCount;

  const visible = automations.filter((a) => (filter === "all" ? true : filter === "active" ? a.enabled : !a.enabled));

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return <EmptyState icon={<Zap className="size-5" />} title="Couldn't load automations" description={error} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h3 text-text-primary">Automations</h1>
          <p className="text-body-sm text-text-secondary">Automate repetitive work in this project.</p>
        </div>
        {canManage && (
          <Button onClick={onCreate}>
            <Plus className="size-4" />
            Create Automation
          </Button>
        )}
      </div>

      {automations.length > 0 && (
        <div className="flex w-fit items-center gap-1 rounded-lg bg-surface-muted p-0.5">
          {(
            [
              ["all", "All", automations.length],
              ["active", "Active", activeCount],
              ["inactive", "Inactive", inactiveCount],
            ] as const
          ).map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-body-sm font-medium transition-colors ${
                filter === key ? "bg-surface text-text-primary shadow-xs" : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {label}
              <span className="text-caption text-text-muted">{count}</span>
            </button>
          ))}
        </div>
      )}

      {automations.length === 0 ? (
        <EmptyState
          icon={<Zap className="size-5" />}
          title="No automations yet"
          description="Automate repetitive work — like commenting when a task is marked done, or assigning a teammate when a task is created."
          action={canManage ? <Button onClick={onCreate}>Create Automation</Button> : undefined}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((automation) => (
            <AutomationCard
              key={automation.id}
              automation={automation}
              runCount={runCountByAutomation.get(automation.id) ?? 0}
              updatedLabel={formatUpdatedLabel(automation.updatedAt)}
              resolveUserName={resolveUserName}
              canManage={canManage}
              onToggleEnabled={(enabled) => onToggleEnabled(automation, enabled)}
              onEdit={() => onEdit(automation)}
              onDelete={() => onDelete(automation)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function formatUpdatedLabel(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(iso).toLocaleDateString();
}
