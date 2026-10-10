import Link from "next/link";
import { FileText, Clock, FileCheck2, Wallet, Plus, ChevronRight, UserX, MessageSquareWarning } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { getOwnerScope } from "@/lib/data/scope";
import { getClientOptions } from "@/lib/data/clients";
import { getLeadOptions } from "@/lib/data/leads";
import { getProjectOptions } from "@/lib/data/appointments";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { DevisFilters } from "@/components/dashboard/devis/devis-filters";
import { DevisFormDialog } from "@/components/dashboard/devis/devis-form-dialog";
import { DevisStatusSelect } from "@/components/dashboard/devis/devis-status-select";
import { filterDevis, getDevisListStats, isDevisExpiringSoon, isDevisExpired } from "@/lib/data/devis";
import { formatCurrencyDA, formatCurrencyCompactDA, formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DevisStatus } from "@/lib/data/operations";

export default async function DevisPage({ searchParams }: PageProps<"/dashboard/devis">) {
  const user = await requirePermission("devis.manage");
  const scope = getOwnerScope(user);

  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q : "";
  const status = typeof params.statut === "string" ? params.statut : "tous";
  const commercial = typeof params.commercial === "string" ? params.commercial : "tous";

  const projectOptions = getProjectOptions(scope);
  const [stats, clientOptions, leadOptions, devis] = await Promise.all([
    getDevisListStats(scope),
    getClientOptions(scope),
    getLeadOptions(scope),
    filterDevis({ search, status: status as DevisStatus | "tous", commercial }, scope),
  ]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-medium text-text-primary sm:text-3xl">
            {scope ? "Mes devis" : "Devis"}
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            {scope
              ? "Les devis dont vous êtes le commercial responsable."
              : "Gérez tous vos devis et convertissez vos opportunités en projets."}
          </p>
        </div>
        <DevisFormDialog
          clients={clientOptions}
          leads={leadOptions}
          projects={projectOptions}
          lockedCommercial={scope ?? undefined}
          trigger={
            <Button>
              <Plus className="h-4 w-4" /> Nouveau devis
            </Button>
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <StatCard label={scope ? "Mes devis" : "Total devis"} value={String(stats.total)} icon={FileText} helperText={formatCurrencyCompactDA(stats.totalValue)} />
        <StatCard label="Non assignés" value={String(stats.unassigned)} icon={UserX} helperText="demandes du configurateur" />
        <StatCard label="En attente" value={String(stats.pending)} icon={Clock} helperText="envoyés ou vus" />
        <StatCard label="Modifications" value={String(stats.needsAttention)} icon={MessageSquareWarning} helperText="demandées par le client" />
        <StatCard label="Acceptés" value={String(stats.accepted)} icon={FileCheck2} helperText={formatCurrencyCompactDA(stats.acceptedValue)} />
        <StatCard label="Taux de conversion" value={`${stats.conversionRate}%`} icon={Wallet} helperText="acceptés / (acceptés + refusés)" />
      </div>

      <DevisFilters search={search} status={status} commercial={commercial} hideCommercial={Boolean(scope)} />

      <Card className="overflow-hidden">
        <Table className="border-none">
          <TableHeader>
            <TableRow>
              <TableHead>Référence</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Projet</TableHead>
              <TableHead>Commercial</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Validité</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {devis.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-sm text-text-muted">
                  Aucun devis ne correspond à ces critères.
                </TableCell>
              </TableRow>
            )}
            {devis.map((d) => {
              const expired = isDevisExpired(d.validUntil) && d.status !== "Accepté" && d.status !== "Refusé";
              const expiringSoon = !expired && isDevisExpiringSoon(d.validUntil) && (d.status === "Envoyé" || d.status === "Vu");
              return (
                <TableRow key={d.id}>
                  <TableCell className="font-medium text-text-secondary">
                    <Link href={`/dashboard/devis/${d.id}`} className="hover:text-text-accent">{d.ref}</Link>
                  </TableCell>
                  <TableCell className="font-medium text-text-primary">{d.clientName}</TableCell>
                  <TableCell className="text-text-secondary">{d.projectLabel}</TableCell>
                  <TableCell className="text-text-secondary">
                    {d.commercial ?? <Badge variant="warning">Non assigné</Badge>}
                  </TableCell>
                  <TableCell>
                    <DevisStatusSelect devisId={d.id} status={d.status} />
                  </TableCell>
                  <TableCell className={cn("text-text-secondary", expired && "font-medium text-[var(--status-danger-fg)]")}>
                    {formatShortDate(d.validUntil)}
                    {expired && " · expiré"}
                    {expiringSoon && (
                      <Badge variant="warning" className="ml-2">Bientôt expiré</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatCurrencyDA(d.amount)}</TableCell>
                  <TableCell>
                    <Link href={`/dashboard/devis/${d.id}`} className="focus-ring flex h-8 w-8 items-center justify-center rounded-md text-text-muted hover:text-text-primary">
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
