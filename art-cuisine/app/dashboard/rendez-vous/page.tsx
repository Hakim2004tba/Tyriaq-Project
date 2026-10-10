import Link from "next/link";
import { CalendarCheck, Clock3, CalendarClock, ClipboardCheck, Plus, ChevronRight } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { getOwnerScope } from "@/lib/data/scope";
import { getLeadOptions } from "@/lib/data/leads";
import { getClientOptions } from "@/lib/data/clients";
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
import { AppointmentFilters } from "@/components/dashboard/appointments/appointment-filters";
import { AppointmentFormDialog } from "@/components/dashboard/appointments/appointment-form-dialog";
import { AppointmentStatusSelect } from "@/components/dashboard/appointments/appointment-status-select";
import {
  filterAppointments,
  getAppointmentListStats,
  getLeadNameById,
  getClientNameById,
  getProjectOptions,
  isAppointmentPast,
} from "@/lib/data/appointments";
import { formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AppointmentType, AppointmentStatus } from "@/lib/data/operations";

const TYPE_BADGE: Record<AppointmentType, "gold" | "info" | "warning" | "success" | "neutral"> = {
  Consultation: "gold",
  Showroom: "info",
  "Visite client": "warning",
  "Visite chantier": "success",
  Appel: "neutral",
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${formatShortDate(iso)} · ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
}

export default async function RendezVousPage({ searchParams }: PageProps<"/dashboard/rendez-vous">) {
  const user = await requirePermission("leads.manage");
  const scope = getOwnerScope(user);

  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q : "";
  const type = typeof params.type === "string" ? params.type : "tous";
  const status = typeof params.statut === "string" ? params.statut : "tous";
  const commercial = typeof params.commercial === "string" ? params.commercial : "tous";
  const designer = typeof params.designer === "string" ? params.designer : "tous";

  const stats = getAppointmentListStats(scope);
  const appointments = filterAppointments(
    { search, type: type as AppointmentType | "tous", status: status as AppointmentStatus | "tous", commercial, designer },
    scope,
  );

  const [leadOptions, clientOptions, leadNames, clientNames] = await Promise.all([
    getLeadOptions(scope),
    getClientOptions(scope),
    Promise.all(appointments.map((a) => getLeadNameById(a.leadId))),
    Promise.all(appointments.map((a) => getClientNameById(a.clientId))),
  ]);
  const projectOptions = getProjectOptions(scope);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-medium text-text-primary sm:text-3xl">
            Rendez-vous
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Consultations, visites showroom, visites à domicile, visites chantier et appels planifiés.
          </p>
        </div>
        <AppointmentFormDialog
          leads={leadOptions}
          clients={clientOptions}
          projects={projectOptions}
          lockedCommercial={scope ?? undefined}
          trigger={
            <Button>
              <Plus className="h-4 w-4" /> Nouveau rendez-vous
            </Button>
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total" value={String(stats.total)} icon={CalendarCheck} helperText="tous statuts confondus" />
        <StatCard label="Demandes en attente" value={String(stats.pending)} icon={Clock3} helperText="à confirmer" />
        <StatCard label="Confirmés à venir" value={String(stats.upcomingConfirmed)} icon={CalendarClock} helperText="planifiés" />
        <StatCard label="Sans compte-rendu" value={String(stats.needsFollowUp)} icon={ClipboardCheck} helperText="terminés, à clôturer" />
      </div>

      <AppointmentFilters
        search={search}
        type={type}
        status={status}
        commercial={commercial}
        designer={designer}
        hideCommercial={Boolean(scope)}
      />

      <Card className="overflow-hidden">
        <Table className="border-none">
          <TableHeader>
            <TableRow>
              <TableHead>Date &amp; heure</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Rendez-vous</TableHead>
              <TableHead>Lié à</TableHead>
              <TableHead>Commercial</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {appointments.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-text-muted">
                  Aucun rendez-vous ne correspond à ces critères.
                </TableCell>
              </TableRow>
            )}
            {appointments.map((a, index) => {
              const leadName = leadNames[index];
              const clientName = clientNames[index];
              const past = isAppointmentPast(a.date) && a.status !== "Terminé" && a.status !== "Annulé";

              return (
                <TableRow key={a.id}>
                  <TableCell className={cn("text-text-secondary", past && "font-medium text-[var(--status-danger-fg)]")}>
                    {formatDateTime(a.date)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={TYPE_BADGE[a.type]}>{a.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Link href={`/dashboard/rendez-vous/${a.id}`} className="font-medium text-text-primary hover:text-text-accent">
                      {a.title}
                    </Link>
                    <p className="text-xs text-text-muted">{a.contactName}</p>
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    {leadName && <span>Lead : {leadName}</span>}
                    {clientName && <span>Client : {clientName}</span>}
                    {!leadName && !clientName && <span className="text-text-muted">—</span>}
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    {a.commercial ?? <Badge variant="warning">Non assigné</Badge>}
                  </TableCell>
                  <TableCell>
                    <AppointmentStatusSelect appointmentId={a.id} status={a.status} />
                  </TableCell>
                  <TableCell>
                    <Link href={`/dashboard/rendez-vous/${a.id}`} className="focus-ring flex h-8 w-8 items-center justify-center rounded-md text-text-muted hover:text-text-primary">
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
