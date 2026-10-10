import Link from "next/link";
import { FolderKanban, AlertTriangle, Flame, Wallet, ChevronRight } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { getOwnerScope } from "@/lib/data/scope";
import { filterProjects, getProjectListStats, STAGE_BADGE, PRIORITY_BADGE, isProjectOverdue } from "@/lib/data/project-records";
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
import { ProjectFilters } from "@/components/dashboard/projects/project-filters";
import { formatCurrencyDA, formatCurrencyCompactDA, formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ProjectStage, ProjectPriority } from "@/lib/data/operations";

export default async function ProjetsPage({ searchParams }: PageProps<"/dashboard/projets">) {
  const user = await requirePermission("projects.manage");
  const scope = getOwnerScope(user);

  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q : "";
  const stage = typeof params.etape === "string" ? params.etape : "tous";
  const priority = typeof params.priorite === "string" ? params.priorite : "toutes";

  const stats = getProjectListStats(scope);
  const projects = filterProjects(
    { search, stage: stage as ProjectStage | "tous", priority: priority as ProjectPriority | "toutes" },
    scope,
  );

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-medium text-text-primary sm:text-3xl">
          {scope ? "Mes projets" : "Projets"}
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          De la conception à la livraison — chaque devis accepté devient un projet suivi ici.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Projets actifs" value={String(stats.active)} icon={FolderKanban} helperText={`sur ${stats.total} au total`} />
        <StatCard label="En retard" value={String(stats.delayed)} icon={AlertTriangle} helperText="échéance dépassée" />
        <StatCard label="Priorité urgente" value={String(stats.urgent)} icon={Flame} helperText="à surveiller" />
        <StatCard label="Valeur totale" value={formatCurrencyCompactDA(stats.totalValue)} icon={Wallet} helperText="tous projets confondus" />
      </div>

      <ProjectFilters search={search} stage={stage} priority={priority} />

      <Card className="overflow-hidden">
        <Table className="border-none">
          <TableHeader>
            <TableRow>
              <TableHead>Référence</TableHead>
              <TableHead>Projet</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Étape</TableHead>
              <TableHead>Priorité</TableHead>
              <TableHead>Avancement</TableHead>
              <TableHead>Échéance</TableHead>
              <TableHead className="text-right">Budget</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-sm text-text-muted">
                  Aucun projet ne correspond à ces critères.
                </TableCell>
              </TableRow>
            )}
            {projects.map((p) => {
              const late = isProjectOverdue(p);
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium text-text-secondary">
                    <Link href={`/dashboard/projets/${p.id}`} className="hover:text-text-accent">{p.ref}</Link>
                  </TableCell>
                  <TableCell className="text-text-primary">{p.name}</TableCell>
                  <TableCell className="text-text-secondary">{p.clientName}</TableCell>
                  <TableCell>
                    <Badge variant={STAGE_BADGE[p.stage]}>{p.stage}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={PRIORITY_BADGE[p.priority]}>{p.priority}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-sunken">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${p.progress}%` }} />
                      </div>
                      <span className="text-xs text-text-muted">{p.progress}%</span>
                    </div>
                  </TableCell>
                  <TableCell className={cn("text-text-secondary", late && "font-medium text-[var(--status-danger-fg)]")}>
                    {formatShortDate(p.dueDate)}
                    {late && " · en retard"}
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatCurrencyDA(p.amount)}</TableCell>
                  <TableCell>
                    <Link href={`/dashboard/projets/${p.id}`} className="focus-ring flex h-8 w-8 items-center justify-center rounded-md text-text-muted hover:text-text-primary">
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
