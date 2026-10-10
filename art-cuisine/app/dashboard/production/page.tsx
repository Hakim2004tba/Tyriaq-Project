import Link from "next/link";
import { Factory, ClipboardCheck, PackageCheck, AlertTriangle, ChevronRight } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { getOwnerScope } from "@/lib/data/scope";
import { PROJECTS } from "@/lib/data/operations";
import {
  filterProductionOrders,
  getProductionListStats,
  getEligibleProjectOptions,
  isProductionOrderOverdue,
  PRODUCTION_STAGE_BADGE,
  PRODUCTION_STAGES,
} from "@/lib/data/production";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { CreateProductionOrderDialog } from "@/components/dashboard/production/create-production-order-dialog";
import { formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ProductionStage } from "@/lib/data/operations";

export default async function ProductionPage({ searchParams }: PageProps<"/dashboard/production">) {
  const user = await requirePermission("production.manage");
  const scope = getOwnerScope(user);

  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q : "";
  const stage = typeof params.etape === "string" ? params.etape : "toutes";

  const commercialByProjectRef = new Map(PROJECTS.map((p) => [p.ref, p.commercial] as const));
  const stats = getProductionListStats(scope, commercialByProjectRef);
  const orders = filterProductionOrders({ search, stage: stage as ProductionStage | "toutes" }, scope, commercialByProjectRef);
  const projectOptions = getEligibleProjectOptions(scope);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-medium text-text-primary sm:text-3xl">Production</h1>
          <p className="mt-1 text-sm text-text-muted">
            À préparer → Découpe → Usinage → Assemblage → Contrôle qualité → Prêt pour vernissage.
          </p>
        </div>
        <CreateProductionOrderDialog projectOptions={projectOptions} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Ordres actifs" value={String(stats.inProgress)} icon={Factory} helperText={`sur ${stats.total} au total`} />
        <StatCard label="En contrôle qualité" value={String(stats.inQualityControl)} icon={ClipboardCheck} helperText="à valider" />
        <StatCard label="Prêts pour vernissage" value={String(stats.readyForVernissage)} icon={PackageCheck} helperText="production terminée" />
        <StatCard label="En retard" value={String(stats.overdue)} icon={AlertTriangle} helperText="échéance dépassée" />
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border-subtle p-3">
          <Link
            href="/dashboard/production"
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium",
              stage === "toutes" ? "bg-ink-950 text-white" : "text-text-secondary hover:bg-surface-sunken",
            )}
          >
            Toutes
          </Link>
          {PRODUCTION_STAGES.map((s) => (
            <Link
              key={s}
              href={`/dashboard/production?etape=${encodeURIComponent(s)}`}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium",
                stage === s ? "bg-ink-950 text-white" : "text-text-secondary hover:bg-surface-sunken",
              )}
            >
              {s}
            </Link>
          ))}
        </div>
        <Table className="border-none">
          <TableHeader>
            <TableRow>
              <TableHead>Référence</TableHead>
              <TableHead>Projet</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Étape</TableHead>
              <TableHead>Équipe</TableHead>
              <TableHead>Avancement</TableHead>
              <TableHead>Échéance</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-sm text-text-muted">
                  Aucun ordre de fabrication ne correspond à ces critères.
                </TableCell>
              </TableRow>
            )}
            {orders.map((o) => {
              const late = isProductionOrderOverdue(o);
              return (
                <TableRow key={o.id}>
                  <TableCell className="font-medium text-text-secondary">
                    <Link href={`/dashboard/production/${o.id}`} className="hover:text-text-accent">{o.ref}</Link>
                  </TableCell>
                  <TableCell className="text-text-primary">{o.projectRef}</TableCell>
                  <TableCell className="text-text-secondary">{o.clientName}</TableCell>
                  <TableCell>
                    <Badge variant={PRODUCTION_STAGE_BADGE[o.stage]}>{o.stage}</Badge>
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    {o.assignedWorkers.length > 0 ? o.assignedWorkers.join(", ") : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-sunken">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${o.progress}%` }} />
                      </div>
                      <span className="text-xs text-text-muted">{o.progress}%</span>
                    </div>
                  </TableCell>
                  <TableCell className={cn("text-text-secondary", late && "font-medium text-[var(--status-danger-fg)]")}>
                    {formatShortDate(o.deadline)}
                    {late && " · en retard"}
                  </TableCell>
                  <TableCell>
                    <Link href={`/dashboard/production/${o.id}`} className="focus-ring flex h-8 w-8 items-center justify-center rounded-md text-text-muted hover:text-text-primary">
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
