import { DashboardFilters } from "@/components/dashboard/admin/dashboard-filters";
import { KpiRow } from "@/components/dashboard/admin/kpi-row";
import { PipelineOverview } from "@/components/dashboard/admin/pipeline-overview";
import { PaymentsPanel } from "@/components/dashboard/admin/payments-panel";
import { SavPanel } from "@/components/dashboard/admin/sav-panel";
import { DelayedProjectsPanel } from "@/components/dashboard/admin/delayed-projects-panel";
import { TasksPanel } from "@/components/dashboard/admin/tasks-panel";
import { NotificationsPanel } from "@/components/dashboard/admin/notifications-panel";
import { ActivityPanel } from "@/components/dashboard/admin/activity-panel";
import { isPeriodKey, type PeriodKey } from "@/lib/data/metrics";
import { PROJECT_STAGES, type ProjectStage } from "@/lib/data/operations";
import type { SessionUser } from "@/lib/auth/session";

const VALID_STAGES: ProjectStage[] = [...PROJECT_STAGES];

function isProjectStage(value: string | undefined): value is ProjectStage {
  return !!value && (VALID_STAGES as string[]).includes(value);
}

interface AdminOverviewProps {
  user: SessionUser;
  rawSearchParams: Record<string, string | string[] | undefined>;
}

function AdminOverview({ user, rawSearchParams }: AdminOverviewProps) {
  const periodeParam = Array.isArray(rawSearchParams.periode)
    ? rawSearchParams.periode[0]
    : rawSearchParams.periode;
  const etapeParam = Array.isArray(rawSearchParams.etape)
    ? rawSearchParams.etape[0]
    : rawSearchParams.etape;

  const period: PeriodKey = isPeriodKey(periodeParam) ? periodeParam : "30j";
  const stage: ProjectStage | "tous" = isProjectStage(etapeParam) ? etapeParam : "tous";

  const firstName = user.name.split(" ")[0];

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-2xl font-medium text-text-primary sm:text-3xl">
            Bonjour {firstName},
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Voici l&rsquo;aperçu opérationnel complet de l&rsquo;entreprise.
          </p>
        </div>
        <DashboardFilters period={period} stage={stage} />
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          Performance commerciale
        </h2>
        <KpiRow period={period} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          Suivi de production
        </h2>
        <PipelineOverview stage={stage} />
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="flex flex-col gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Paiements
          </h2>
          <PaymentsPanel period={period} />
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Service après-vente
          </h2>
          <SavPanel />
        </section>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          Points d&rsquo;attention
        </h2>
        <DelayedProjectsPanel />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          Tâches de l&rsquo;équipe
        </h2>
        <TasksPanel />
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="flex flex-col gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Notifications
          </h2>
          <NotificationsPanel />
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Activité récente
          </h2>
          <ActivityPanel period={period} />
        </section>
      </div>
    </div>
  );
}

export { AdminOverview };
