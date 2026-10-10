import Link from "next/link";
import { FolderKanban, Factory, Paintbrush, Wrench } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatCurrencyDA, formatShortDate } from "@/lib/format";
import { PROJECTS, type ProjectStage } from "@/lib/data/operations";
import { STAGES, getProjectsByStage, getActiveProjectsCount, daysLate, isOverdue } from "@/lib/data/metrics";
import { STAGE_COLOR, STAGE_BADGE } from "@/lib/data/project-records";

function PipelineOverview({ stage }: { stage: ProjectStage | "tous" }) {
  const byStage = getProjectsByStage();
  const active = getActiveProjectsCount();
  const total = PROJECTS.length;

  const projects = stage === "tous" ? PROJECTS : byStage[stage];

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Projets actifs" value={String(active)} icon={FolderKanban} helperText={`sur ${total} projets au total`} />
        <StatCard label="Production" value={String(byStage.Production.length)} icon={Factory} helperText="en atelier" />
        <StatCard label="Vernissage" value={String(byStage.Vernissage.length)} icon={Paintbrush} helperText="en finition" />
        <StatCard label="Montage" value={String(byStage.Montage.length)} icon={Wrench} helperText="pose en cours" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Répartition par étape</CardTitle>
          <CardDescription>{total} projets suivis, tous statuts confondus.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-sunken">
            {STAGES.map((s) => {
              const pct = (byStage[s].length / total) * 100;
              if (pct === 0) return null;
              return (
                <div
                  key={s}
                  className={cn(STAGE_COLOR[s])}
                  style={{ width: `${pct}%` }}
                  title={`${s} — ${byStage[s].length}`}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {STAGES.map((s) => (
              <span key={s} className="flex items-center gap-2 text-xs text-text-muted">
                <span className={cn("h-2 w-2 rounded-full", STAGE_COLOR[s])} />
                {s} — <span className="font-medium text-text-primary">{byStage[s].length}</span>
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Projets {stage !== "tous" && `— ${stage}`}</CardTitle>
          <CardDescription>
            {projects.length} projet{projects.length > 1 ? "s" : ""}
            {stage === "tous" ? " (toutes étapes)" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table className="border-none">
            <TableHeader>
              <TableRow>
                <TableHead>Référence</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Étape</TableHead>
                <TableHead>Avancement</TableHead>
                <TableHead>Livraison</TableHead>
                <TableHead className="text-right">Montant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((p) => {
                const late = p.stage !== "Terminé" && isOverdue(p.dueDate);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium text-text-secondary">
                      <Link href={`/dashboard/projets/${p.id}`} className="hover:text-text-accent">{p.ref}</Link>
                    </TableCell>
                    <TableCell>{p.clientName}</TableCell>
                    <TableCell>
                      <Badge variant={STAGE_BADGE[p.stage]}>{p.stage}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-sunken">
                          <div className="h-full rounded-full bg-accent" style={{ width: `${p.progress}%` }} />
                        </div>
                        <span className="text-xs text-text-muted">{p.progress}%</span>
                      </div>
                    </TableCell>
                    <TableCell className={cn(late && "font-medium text-[var(--status-danger-fg)]")}>
                      {formatShortDate(p.dueDate)}
                      {late && ` · ${daysLate(p.dueDate)}j de retard`}
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrencyDA(p.amount)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export { PipelineOverview };
