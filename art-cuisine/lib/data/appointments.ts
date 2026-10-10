import {
  APPOINTMENTS,
  APPOINTMENT_TYPES,
  APPOINTMENT_STATUSES,
  COMMERCIALS,
  DESIGNERS,
  PROJECTS,
  type AppointmentRecord,
  type AppointmentType,
  type AppointmentStatus,
} from "@/lib/data/operations";
import { getClientById } from "@/lib/data/clients";
import { getLeadById } from "@/lib/data/leads";

export { APPOINTMENT_TYPES, APPOINTMENT_STATUSES, COMMERCIALS, DESIGNERS };

export interface AppointmentFilters {
  search?: string;
  type?: AppointmentType | "tous";
  status?: AppointmentStatus | "tous";
  commercial?: string | "tous";
  designer?: string | "tous";
}

/**
 * `scope` (a commercial's own name, or null for admins) restricts the list
 * to that commercial's own appointments plus any unclaimed public requests
 * — a shared inbox for consultation requests nobody has picked up yet.
 * When `scope` is null the explicit `commercial` filter applies instead.
 */
export function filterAppointments(filters: AppointmentFilters, scope: string | null): AppointmentRecord[] {
  const search = filters.search?.trim().toLowerCase();

  return APPOINTMENTS.filter((a) => {
    if (scope) {
      if (a.commercial !== scope && a.commercial !== null) return false;
    } else if (filters.commercial && filters.commercial !== "tous" && a.commercial !== filters.commercial) {
      return false;
    }
    if (filters.type && filters.type !== "tous" && a.type !== filters.type) return false;
    if (filters.status && filters.status !== "tous" && a.status !== filters.status) return false;
    if (filters.designer && filters.designer !== "tous" && a.designer !== filters.designer) return false;
    if (search) {
      const haystack = `${a.title} ${a.contactName} ${a.contactEmail} ${a.contactPhone}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function getAppointmentById(id: string): AppointmentRecord | undefined {
  return APPOINTMENTS.find((a) => a.id === id);
}

export interface AppointmentListStats {
  total: number;
  pending: number;
  upcomingConfirmed: number;
  needsFollowUp: number;
}

export function getAppointmentListStats(scope: string | null = null): AppointmentListStats {
  const pool = scope ? APPOINTMENTS.filter((a) => a.commercial === scope || a.commercial === null) : APPOINTMENTS;
  const now = Date.now();

  return {
    total: pool.length,
    pending: pool.filter((a) => a.status === "Demandé").length,
    upcomingConfirmed: pool.filter((a) => a.status === "Confirmé" && new Date(a.date).getTime() >= now).length,
    needsFollowUp: pool.filter((a) => a.status === "Terminé" && !a.followUpNotes).length,
  };
}

export function getUpcomingAppointments(scope: string | null, limit = 5): AppointmentRecord[] {
  const now = Date.now();
  const pool = scope ? APPOINTMENTS.filter((a) => a.commercial === scope || a.commercial === null) : APPOINTMENTS;

  return pool
    .filter((a) => a.status !== "Annulé" && a.status !== "Terminé" && new Date(a.date).getTime() >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, limit);
}

export async function getLeadNameById(id: string | null): Promise<string | null> {
  if (!id) return null;
  const lead = await getLeadById(id);
  return lead?.name ?? null;
}

export async function getClientNameById(id: string | null): Promise<string | null> {
  if (!id) return null;
  const client = await getClientById(id);
  return client?.name ?? null;
}

export function getProjectByRef(ref: string | null) {
  if (!ref) return null;
  return PROJECTS.find((p) => p.ref === ref) ?? null;
}

/** Project ref/label options for pickers, optionally scoped to a commercial. */
export function getProjectOptions(scope: string | null = null) {
  const pool = scope ? PROJECTS.filter((p) => p.commercial === scope) : PROJECTS;
  return pool
    .map((p) => ({ ref: p.ref, label: `${p.ref} — ${p.name} (${p.clientName})` }))
    .sort((a, b) => a.ref.localeCompare(b.ref));
}

export function isAppointmentPast(date: string): boolean {
  return new Date(date).getTime() < Date.now();
}

export function getAppointmentsForLead(leadId: string): AppointmentRecord[] {
  return APPOINTMENTS.filter((a) => a.leadId === leadId).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

export function getAppointmentsForClient(clientId: string): AppointmentRecord[] {
  return APPOINTMENTS.filter((a) => a.clientId === clientId).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}
