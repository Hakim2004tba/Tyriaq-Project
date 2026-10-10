import { Headset, ShieldCheck, FileText } from "lucide-react";
import { requireAnyPermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import type { Role } from "@/lib/auth/roles";
import { getClientByEmail } from "@/lib/data/clients";
import { getProjectsForClient } from "@/lib/data/project-records";
import { getDocumentsForProject } from "@/lib/data/documents";
import { getSavTicketsForClient, filterSavTickets, getSavListStats } from "@/lib/data/sav";
import { formatShortDate } from "@/lib/format";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateSavTicketDialog } from "@/components/dashboard/sav/create-sav-ticket-dialog";
import { SavStatusForm } from "@/components/dashboard/sav/sav-status-form";
import type { SavStatus, SavPriority } from "@/lib/data/operations";

const STATUS_BADGE: Record<SavStatus, "neutral" | "info" | "warning" | "success"> = {
  Ouvert: "warning",
  Planifié: "info",
  "En cours": "info",
  Résolu: "success",
};

const PRIORITY_BADGE: Record<SavPriority, "neutral" | "info" | "warning" | "danger"> = {
  Basse: "neutral",
  Normale: "info",
  Haute: "warning",
  Urgente: "danger",
};

const WARRANTY_YEARS = 5;

function getWarrantyEndDate(completedAtIso: string): Date {
  const endDate = new Date(completedAtIso);
  endDate.setFullYear(endDate.getFullYear() + WARRANTY_YEARS);
  return endDate;
}

function isWarrantyActive(endDate: Date): boolean {
  return endDate.getTime() > Date.now();
}

export default async function SavPage({ searchParams }: PageProps<"/dashboard/sav">) {
  const user = await requireAnyPermission(["sav.manage", "sav.view_own"]);
  const canManage = hasPermission(user.role as Role, "sav.manage");

  if (canManage) {
    const params = await searchParams;
    const search = typeof params.q === "string" ? params.q : "";
    const status = typeof params.statut === "string" ? (params.statut as SavStatus | "tous") : "tous";
    const priority = typeof params.priorite === "string" ? (params.priorite as SavPriority | "toutes") : "toutes";

    const stats = getSavListStats();
    const tickets = filterSavTickets({ search, status, priority });

    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div>
          <h1 className="font-display text-2xl font-medium text-text-primary sm:text-3xl">SAV</h1>
          <p className="mt-1 text-sm text-text-muted">Suivi des demandes de service après-vente.</p>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Total" value={String(stats.total)} icon={Headset} helperText="tickets" />
          <StatCard label="Ouverts" value={String(stats.open)} icon={Headset} helperText="à traiter" />
          <StatCard label="En cours" value={String(stats.inProgress)} icon={Headset} helperText="planifiés / en cours" />
          <StatCard label="Résolus" value={String(stats.resolved)} icon={Headset} helperText="clôturés" />
        </div>

        {tickets.length === 0 ? (
          <Card className="p-10 text-center text-sm text-text-muted">Aucun ticket ne correspond à ces critères.</Card>
        ) : (
          <div className="flex flex-col gap-4">
            {tickets.map((ticket) => (
              <Card key={ticket.id}>
                <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle>{ticket.ref}</CardTitle>
                      <Badge variant={STATUS_BADGE[ticket.status]}>{ticket.status}</Badge>
                      <Badge variant={PRIORITY_BADGE[ticket.priority]}>{ticket.priority}</Badge>
                    </div>
                    <CardDescription className="mt-1">{ticket.clientName} · {ticket.projectRef}</CardDescription>
                  </div>
                  <span className="text-xs text-text-muted">{formatShortDate(ticket.createdAt)}</span>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <p className="text-sm text-text-secondary">{ticket.issue}</p>
                  <SavStatusForm ticket={ticket} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- Client view: own tickets + warranty ---------------------------------
  const client = await getClientByEmail(user.email);

  if (!client) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 py-16 text-center">
        <Headset className="h-8 w-8 text-text-muted" />
        <p className="text-sm text-text-muted">
          Aucune fiche client n&rsquo;est associée à votre compte pour le moment. Contactez votre commercial.
        </p>
      </div>
    );
  }

  const tickets = getSavTicketsForClient(client.id);
  const projects = getProjectsForClient(client.id);
  const completedProjects = projects.filter((p) => p.stage === "Terminé" && p.completedAt);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-medium text-text-primary sm:text-3xl">SAV & Garantie</h1>
          <p className="mt-1 text-sm text-text-muted">Suivez vos demandes d&rsquo;intervention et votre garantie.</p>
        </div>
        <CreateSavTicketDialog projects={projects.map((p) => ({ ref: p.ref, name: p.name }))} />
      </div>

      {completedProjects.length > 0 && (
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <ShieldCheck className="h-4 w-4 text-text-muted" />
            <h2 className="text-sm font-semibold text-text-primary">Votre garantie</h2>
          </div>
          <div className="flex flex-col gap-4">
            {completedProjects.map((p) => {
              const endDate = getWarrantyEndDate(p.completedAt!);
              const active = isWarrantyActive(endDate);
              const warrantyDocs = getDocumentsForProject(p.ref).filter((d) => d.category === "Garantie");

              return (
                <div key={p.id} className="flex flex-col gap-2 border-b border-border-subtle pb-4 last:border-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-text-primary">{p.name}</p>
                    <Badge variant={active ? "success" : "neutral"}>{active ? "Garantie active" : "Garantie expirée"}</Badge>
                  </div>
                  <p className="text-xs text-text-muted">
                    {WARRANTY_YEARS} ans à partir du {formatShortDate(p.completedAt!)} — jusqu&rsquo;au {formatShortDate(endDate.toISOString())}
                  </p>
                  {warrantyDocs.map((doc) => (
                    <a key={doc.id} href={doc.dataUrl ?? "#"} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-text-accent hover:opacity-70">
                      <FileText className="h-3.5 w-3.5" /> {doc.name}
                    </a>
                  ))}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {tickets.length === 0 ? (
        <Card className="p-10 text-center text-sm text-text-muted">Aucune demande SAV pour le moment.</Card>
      ) : (
        <div className="flex flex-col gap-4">
          {tickets.map((ticket) => (
            <Card key={ticket.id}>
              <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle>{ticket.ref}</CardTitle>
                    <Badge variant={STATUS_BADGE[ticket.status]}>{ticket.status}</Badge>
                  </div>
                  <CardDescription className="mt-1">{ticket.projectRef}</CardDescription>
                </div>
                <span className="text-xs text-text-muted">{formatShortDate(ticket.createdAt)}</span>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-text-secondary">{ticket.issue}</p>
                {ticket.assignedTo && <p className="mt-2 text-xs text-text-muted">Technicien assigné : {ticket.assignedTo}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
