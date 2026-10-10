import Link from "next/link";
import { Target, Sparkles, Wallet, TrendingUp, Plus, LayoutGrid, List as ListIcon } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { getOwnerScope } from "@/lib/data/scope";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LeadFilters } from "@/components/dashboard/leads/lead-filters";
import { LeadFormDialog } from "@/components/dashboard/leads/lead-form-dialog";
import { PipelineBoard } from "@/components/dashboard/leads/pipeline-board";
import { LeadListView } from "@/components/dashboard/leads/lead-list-view";
import { filterLeads, getLeadsByStatus, getLeadListStats } from "@/lib/data/leads";
import { formatCurrencyCompactDA } from "@/lib/format";
import type { LeadSource } from "@/lib/data/operations";

export default async function LeadsPage({ searchParams }: PageProps<"/dashboard/leads">) {
  const user = await requirePermission("leads.manage");
  const scope = getOwnerScope(user);

  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q : "";
  const source = typeof params.source === "string" ? params.source : "tous";
  const commercial = scope ?? (typeof params.commercial === "string" ? params.commercial : "tous");
  const projectType = typeof params.type === "string" ? params.type : "tous";
  const budgetRange = typeof params.budget === "string" ? params.budget : "tous";
  const view = params.vue === "liste" ? "liste" : "pipeline";

  const baseParams = new URLSearchParams();
  if (search) baseParams.set("q", search);
  if (source !== "tous") baseParams.set("source", source);
  if (commercial !== "tous") baseParams.set("commercial", commercial);
  if (projectType !== "tous") baseParams.set("type", projectType);
  if (budgetRange !== "tous") baseParams.set("budget", budgetRange);

  const pipelineHref = baseParams.toString() ? `/dashboard/leads?${baseParams.toString()}` : "/dashboard/leads";
  const listParams = new URLSearchParams(baseParams);
  listParams.set("vue", "liste");
  const listHref = `/dashboard/leads?${listParams.toString()}`;

  const [stats, leads] = await Promise.all([
    getLeadListStats(scope),
    filterLeads({
      search,
      source: source as LeadSource | "tous",
      commercial,
      projectType,
      budgetRange,
    }),
  ]);

  return (
    <div className="mx-auto flex max-w-[100rem] flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-medium text-text-primary sm:text-3xl">
            {scope ? "Mes leads" : "Leads"}
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            {scope
              ? "Les prospects dont vous êtes le commercial responsable."
              : "Suivez vos prospects depuis leur premier contact jusqu’à la signature."}
          </p>
        </div>
        <LeadFormDialog
          lockedCommercial={scope ?? undefined}
          trigger={
            <Button>
              <Plus className="h-4 w-4" /> Nouveau lead
            </Button>
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={scope ? "Mes leads" : "Total leads"} value={String(stats.total)} icon={Target} helperText="tous statuts confondus" />
        <StatCard label="Nouveaux (7 jours)" value={String(stats.newThisWeek)} icon={Sparkles} helperText="créés cette semaine" />
        <StatCard label="Valeur du pipeline" value={formatCurrencyCompactDA(stats.pipelineValue)} icon={Wallet} helperText="leads actifs, budgets cumulés" />
        <StatCard label="Taux de conversion" value={`${stats.conversionRate}%`} icon={TrendingUp} helperText="gagnés / (gagnés + perdus)" />
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <LeadFilters
          search={search}
          source={source}
          commercial={commercial}
          projectType={projectType}
          budgetRange={budgetRange}
          hideCommercial={Boolean(scope)}
        />

        <div className="flex items-center gap-1 rounded-md border border-border-default bg-surface-raised p-1">
          <Link
            href={pipelineHref}
            className={cn(
              "flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-medium transition-colors",
              view === "pipeline" ? "bg-ink-950 text-white" : "text-text-secondary hover:text-text-primary",
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Pipeline
          </Link>
          <Link
            href={listHref}
            className={cn(
              "flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-medium transition-colors",
              view === "liste" ? "bg-ink-950 text-white" : "text-text-secondary hover:text-text-primary",
            )}
          >
            <ListIcon className="h-3.5 w-3.5" /> Liste
          </Link>
        </div>
      </div>

      {view === "pipeline" ? (
        <PipelineBoard leadsByStatus={getLeadsByStatus(leads)} />
      ) : (
        <LeadListView leads={leads} />
      )}
    </div>
  );
}
