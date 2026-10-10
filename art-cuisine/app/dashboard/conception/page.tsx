import Link from "next/link";
import { Palette, Clock, MessageSquareWarning, CheckCircle2, Ruler, ChevronRight } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { getOwnerScope } from "@/lib/data/scope";
import { getProjectsAwaitingDesign, getDesignListStats, DESIGN_STATUS_BADGE } from "@/lib/data/design";
import { STAGE_BADGE } from "@/lib/data/project-records";
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
import { formatShortDate } from "@/lib/format";

export default async function ConceptionPage() {
  const user = await requirePermission("conception.manage");
  const scope = getOwnerScope(user);

  const stats = getDesignListStats(scope);
  const projects = getProjectsAwaitingDesign(scope);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-medium text-text-primary sm:text-3xl">Conception</h1>
        <p className="mt-1 text-sm text-text-muted">
          Plans, designs et rendus — chaque projet reste ici tant que son design n&rsquo;est pas validé par le client.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="En cours de conception" value={String(stats.total)} icon={Palette} helperText="projets actifs" />
        <StatCard label="Envoyés au client" value={String(stats.awaitingClient)} icon={Clock} helperText="en attente de validation" />
        <StatCard label="Modification demandée" value={String(stats.needsRevision)} icon={MessageSquareWarning} helperText="à retravailler" />
        <StatCard label="Validés" value={String(stats.validated)} icon={CheckCircle2} helperText="prêts pour la production" />
      </div>

      <Card className="overflow-hidden">
        <Table className="border-none">
          <TableHeader>
            <TableRow>
              <TableHead>Référence</TableHead>
              <TableHead>Projet</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Designer</TableHead>
              <TableHead>Étape</TableHead>
              <TableHead>Design</TableHead>
              <TableHead>Mesures</TableHead>
              <TableHead>Échéance</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-sm text-text-muted">
                  Aucun projet en attente de conception.
                </TableCell>
              </TableRow>
            )}
            {projects.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium text-text-secondary">
                  <Link href={`/dashboard/projets/${p.id}`} className="hover:text-text-accent">{p.ref}</Link>
                </TableCell>
                <TableCell className="text-text-primary">{p.name}</TableCell>
                <TableCell className="text-text-secondary">{p.clientName}</TableCell>
                <TableCell className="text-text-secondary">{p.designer ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={STAGE_BADGE[p.stage]}>{p.stage}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={DESIGN_STATUS_BADGE[p.designStatus]}>{p.designStatus}</Badge>
                </TableCell>
                <TableCell>
                  {p.measurements ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
                      <Ruler className="h-3.5 w-3.5 text-text-muted" /> {p.measurements.width}×{p.measurements.depth}×{p.measurements.height} m
                    </span>
                  ) : (
                    <span className="text-xs text-text-muted">Non relevées</span>
                  )}
                </TableCell>
                <TableCell className="text-text-secondary">{formatShortDate(p.dueDate)}</TableCell>
                <TableCell>
                  <Link href={`/dashboard/projets/${p.id}`} className="focus-ring flex h-8 w-8 items-center justify-center rounded-md text-text-muted hover:text-text-primary">
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
