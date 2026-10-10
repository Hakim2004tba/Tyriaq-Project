import Link from "next/link";
import { Paintbrush, ClipboardCheck, PackageCheck, AlertTriangle, ChevronRight } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import {
  filterVernissageJobs,
  getVernissageListStats,
  getEligibleProjectOptions,
  getVernisseurScope,
  isVernissageJobOverdue,
  VERNISSAGE_STAGE_BADGE,
  VERNISSAGE_STAGES,
} from "@/lib/data/vernissage";
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
import { CreateVernissageJobDialog } from "@/components/dashboard/vernissage/create-vernissage-job-dialog";
import { formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { VernissageStage } from "@/lib/data/operations";

export default async function VernissagePage({ searchParams }: PageProps<"/dashboard/vernissage">) {
  const user = await requirePermission("vernissage.manage");
  const scope = getVernisseurScope(user);

  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q : "";
  const stage = typeof params.etape === "string" ? params.etape : "toutes";

  const stats = getVernissageListStats(scope);
  const jobs = filterVernissageJobs({ search, stage: stage as VernissageStage | "toutes" }, scope);
  const projectOptions = getEligibleProjectOptions();

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-medium text-text-primary sm:text-3xl">
            {scope ? "Mes jobs de vernissage" : "Vernissage"}
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            À vernir → Préparation → Ponçage → Apprêt → Vernissage → Séchage → Contrôle qualité → Terminé.
          </p>
        </div>
        <CreateVernissageJobDialog projectOptions={projectOptions} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Jobs actifs" value={String(stats.inProgress)} icon={Paintbrush} helperText={`sur ${stats.total} au total`} />
        <StatCard label="En contrôle qualité" value={String(stats.inQualityControl)} icon={ClipboardCheck} helperText="à valider" />
        <StatCard label="Terminés" value={String(stats.done)} icon={PackageCheck} helperText="approuvés" />
        <StatCard label="En retard" value={String(stats.overdue)} icon={AlertTriangle} helperText="échéance dépassée" />
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border-subtle p-3">
          <Link
            href="/dashboard/vernissage"
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium",
              stage === "toutes" ? "bg-ink-950 text-white" : "text-text-secondary hover:bg-surface-sunken",
            )}
          >
            Toutes
          </Link>
          {VERNISSAGE_STAGES.map((s) => (
            <Link
              key={s}
              href={`/dashboard/vernissage?etape=${encodeURIComponent(s)}`}
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
            {jobs.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-sm text-text-muted">
                  {scope ? "Aucun job de vernissage ne vous est assigné pour le moment." : "Aucun job de vernissage ne correspond à ces critères."}
                </TableCell>
              </TableRow>
            )}
            {jobs.map((j) => {
              const late = isVernissageJobOverdue(j);
              return (
                <TableRow key={j.id}>
                  <TableCell className="font-medium text-text-secondary">
                    <Link href={`/dashboard/vernissage/${j.id}`} className="hover:text-text-accent">{j.ref}</Link>
                  </TableCell>
                  <TableCell className="text-text-primary">{j.projectRef}</TableCell>
                  <TableCell className="text-text-secondary">{j.clientName}</TableCell>
                  <TableCell>
                    <Badge variant={VERNISSAGE_STAGE_BADGE[j.stage]}>{j.stage}</Badge>
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    {j.assignedVernisseurs.length > 0 ? j.assignedVernisseurs.join(", ") : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-sunken">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${j.progress}%` }} />
                      </div>
                      <span className="text-xs text-text-muted">{j.progress}%</span>
                    </div>
                  </TableCell>
                  <TableCell className={cn("text-text-secondary", late && "font-medium text-[var(--status-danger-fg)]")}>
                    {formatShortDate(j.deadline)}
                    {late && " · en retard"}
                  </TableCell>
                  <TableCell>
                    <Link href={`/dashboard/vernissage/${j.id}`} className="focus-ring flex h-8 w-8 items-center justify-center rounded-md text-text-muted hover:text-text-primary">
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
