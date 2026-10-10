import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  UserRound,
  Palette,
  Clock,
  Pencil,
  Target,
  Users,
  FolderKanban,
  BellRing,
} from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { getOwnerScope } from "@/lib/data/scope";
import { getLeadOptions, getLeadById } from "@/lib/data/leads";
import { getClientOptions, getClientById } from "@/lib/data/clients";
import {
  getAppointmentById,
  getProjectOptions,
  getProjectByRef,
} from "@/lib/data/appointments";
import { formatShortDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { AppointmentFormDialog } from "@/components/dashboard/appointments/appointment-form-dialog";
import { AppointmentStatusSelect } from "@/components/dashboard/appointments/appointment-status-select";
import { FollowUpPanel } from "@/components/dashboard/appointments/follow-up-panel";
import type { AppointmentType } from "@/lib/data/operations";

const TYPE_BADGE: Record<AppointmentType, "gold" | "info" | "warning" | "success" | "neutral"> = {
  Consultation: "gold",
  Showroom: "info",
  "Visite client": "warning",
  "Visite chantier": "success",
  Appel: "neutral",
};

export async function generateMetadata({
  params,
}: PageProps<"/dashboard/rendez-vous/[id]">): Promise<Metadata> {
  const { id } = await params;
  const appointment = getAppointmentById(id);
  return { title: appointment ? `${appointment.title} — ART Cuisine` : "Rendez-vous — ART Cuisine" };
}

export default async function AppointmentDetailPage({ params }: PageProps<"/dashboard/rendez-vous/[id]">) {
  const user = await requirePermission("leads.manage");
  const scope = getOwnerScope(user);
  const { id } = await params;

  const appointment = getAppointmentById(id);
  if (!appointment) notFound();
  if (scope && appointment.commercial !== null && appointment.commercial !== scope) notFound();

  const [lead, client, leadOptions, clientOptions] = await Promise.all([
    getLeadById(appointment.leadId ?? ""),
    getClientById(appointment.clientId ?? ""),
    getLeadOptions(scope),
    getClientOptions(scope),
  ]);
  const project = getProjectByRef(appointment.projectRef);
  const projectOptions = getProjectOptions(scope);

  const date = new Date(appointment.date);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <Link
        href="/dashboard/rendez-vous"
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-text-muted hover:text-text-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Retour aux rendez-vous
      </Link>

      <Card className="p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-2xl font-medium text-text-primary sm:text-3xl">
                {appointment.title}
              </h1>
              <Badge variant={TYPE_BADGE[appointment.type]}>{appointment.type}</Badge>
              {appointment.source === "Public" && <Badge variant="outline">Demande site web</Badge>}
            </div>
            <p className="mt-1 text-sm text-text-muted">
              {formatShortDate(appointment.date)} à {date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              {" "}· {appointment.durationMinutes} min
            </p>

            <dl className="mt-6 grid gap-x-8 gap-y-3 sm:grid-cols-2">
              <div className="flex items-center gap-2.5 text-sm text-text-secondary">
                <UserRound className="h-4 w-4 shrink-0 text-text-muted" /> {appointment.contactName}
              </div>
              <div className="flex items-center gap-2.5 text-sm text-text-secondary">
                <Phone className="h-4 w-4 shrink-0 text-text-muted" /> {appointment.contactPhone}
              </div>
              <div className="flex items-center gap-2.5 text-sm text-text-secondary">
                <Mail className="h-4 w-4 shrink-0 text-text-muted" /> {appointment.contactEmail}
              </div>
              <div className="flex items-center gap-2.5 text-sm text-text-secondary">
                <MapPin className="h-4 w-4 shrink-0 text-text-muted" /> {appointment.location}
              </div>
              <div className="flex items-center gap-2.5 text-sm text-text-secondary">
                <UserRound className="h-4 w-4 shrink-0 text-text-muted" />
                Commercial : {appointment.commercial ?? <Badge variant="warning">Non assigné</Badge>}
              </div>
              <div className="flex items-center gap-2.5 text-sm text-text-secondary">
                <Palette className="h-4 w-4 shrink-0 text-text-muted" /> Designer : {appointment.designer ?? "—"}
              </div>
              {appointment.reminderMinutesBefore && (
                <div className="flex items-center gap-2.5 text-sm text-text-secondary">
                  <BellRing className="h-4 w-4 shrink-0 text-text-muted" />
                  Rappel {appointment.reminderMinutesBefore >= 1440
                    ? `${appointment.reminderMinutesBefore / 1440} j`
                    : `${appointment.reminderMinutesBefore} min`} avant
                </div>
              )}
            </dl>
          </div>

          <div className="flex flex-col items-stretch gap-3 sm:min-w-56">
            <AppointmentStatusSelect appointmentId={appointment.id} status={appointment.status} className="h-9 w-full" />
            <AppointmentFormDialog
              appointment={appointment}
              leads={leadOptions}
              clients={clientOptions}
              projects={projectOptions}
              lockedCommercial={scope ?? undefined}
              trigger={
                <Button variant="outline">
                  <Pencil className="h-3.5 w-3.5" /> Modifier
                </Button>
              }
            />
          </div>
        </div>
      </Card>

      {(lead || client || project) && (
        <div className="grid gap-4 sm:grid-cols-3">
          {lead && (
            <Link href={`/dashboard/leads/${lead.id}`}>
              <Card className="flex h-full flex-col gap-2 p-5 transition-shadow hover:shadow-elevation-md">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-sunken text-accent-strong">
                  <Target className="h-4 w-4" />
                </span>
                <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Lead lié</p>
                <p className="font-medium text-text-primary">{lead.name}</p>
                <p className="text-xs text-text-muted">{lead.status} · {lead.projectType}</p>
              </Card>
            </Link>
          )}
          {client && (
            <Link href={`/dashboard/clients/${client.id}`}>
              <Card className="flex h-full flex-col gap-2 p-5 transition-shadow hover:shadow-elevation-md">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-sunken text-accent-strong">
                  <Users className="h-4 w-4" />
                </span>
                <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Client lié</p>
                <p className="font-medium text-text-primary">{client.name}</p>
                <p className="text-xs text-text-muted">{client.status} · {client.city}</p>
              </Card>
            </Link>
          )}
          {project && (
            <Link href={`/dashboard/projets/${project.id}`}>
              <Card className="flex h-full flex-col gap-2 p-5 transition-shadow hover:shadow-elevation-md">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-sunken text-accent-strong">
                  <FolderKanban className="h-4 w-4" />
                </span>
                <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Projet lié</p>
                <p className="font-medium text-text-primary">{project.ref}</p>
                <p className="text-xs text-text-muted">{project.stage} · {project.name}</p>
              </Card>
            </Link>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
          <CardDescription>Contexte préparé avant le rendez-vous.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-text-secondary">
            {appointment.notes || "Aucune note."}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-accent-strong">
            <Clock className="h-5 w-5" />
          </span>
          <div>
            <CardTitle>Suivi après rendez-vous</CardTitle>
            <CardDescription>Le compte-rendu et la prochaine étape.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <FollowUpPanel appointmentId={appointment.id} followUpNotes={appointment.followUpNotes} />
        </CardContent>
      </Card>
    </div>
  );
}
