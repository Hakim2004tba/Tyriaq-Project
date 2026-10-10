import { getPgDb } from "@/lib/db/pg";
import { leads as leadsTable, leadInteractions as leadInteractionsTable, clients as clientsTable, devis as devisTable } from "@/lib/db/schema";
import {
  LEAD_STATUSES,
  TASKS,
  PAYMENTS,
  MESSAGES,
  APPOINTMENTS,
  type LeadRecord,
  type LeadInteractionRecord,
  type LeadInteractionType,
  type LeadStatus,
  type ClientRecord,
  type DevisRecord,
  type TaskRecord,
  type PaymentRecord,
  type MessageRecord,
} from "@/lib/data/operations";

async function getAllLeads(): Promise<LeadRecord[]> {
  const rows = await getPgDb().select().from(leadsTable);
  return rows as LeadRecord[];
}

async function getAllClients(): Promise<ClientRecord[]> {
  const rows = await getPgDb().select().from(clientsTable);
  return rows as ClientRecord[];
}

async function getAllDevis(): Promise<DevisRecord[]> {
  const rows = await getPgDb().select().from(devisTable);
  return rows as DevisRecord[];
}

/**
 * Cross-record aggregation helpers for a single commercial's personal
 * workspace: "my leads' follow-ups", "my clients' pending payments"…
 * Passing `scope = null` (an admin) returns the same view across everyone,
 * which keeps these pages useful for admins auditing the team as a whole.
 */

async function myLeadIds(scope: string | null): Promise<Set<string>> {
  const leads = await getAllLeads();
  const pool = scope ? leads.filter((l) => l.commercial === scope) : leads;
  return new Set(pool.map((l) => l.id));
}

export interface MyInteraction extends LeadInteractionRecord {
  leadName: string;
}

export async function getMyInteractions(
  scope: string | null,
  options: { upcomingOnly?: boolean; types?: LeadInteractionType[] } = {},
): Promise<MyInteraction[]> {
  const [ids, leads, interactions] = await Promise.all([
    myLeadIds(scope),
    getAllLeads(),
    getPgDb().select().from(leadInteractionsTable),
  ]);
  const leadNameById = new Map(leads.map((l) => [l.id, l.name]));

  return (interactions as LeadInteractionRecord[])
    .filter((i) => {
      if (!ids.has(i.leadId)) return false;
      if (options.types && !options.types.includes(i.type)) return false;
      if (options.upcomingOnly && (!i.dueDate || i.completed)) return false;
      return true;
    })
    .map((i) => ({ ...i, leadName: leadNameById.get(i.leadId) ?? "Lead" }))
    .sort((a, b) => {
      const aTime = a.dueDate ? new Date(a.dueDate).getTime() : new Date(a.createdAt).getTime();
      const bTime = b.dueDate ? new Date(b.dueDate).getTime() : new Date(b.createdAt).getTime();
      return aTime - bTime;
    });
}

/** Team tasks relevant to the commercial function — shared queue, not per-person. */
export function getMyTasks(): TaskRecord[] {
  return TASKS.filter((t) => t.role === "Commercial" && t.status !== "Terminée").sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
  );
}

export interface MyPayment extends PaymentRecord {
  clientCommercial: string;
}

export async function getMyPendingPayments(scope: string | null): Promise<MyPayment[]> {
  const clients = await getAllClients();
  const commercialByClient = new Map(clients.map((c) => [c.name, c.commercial]));

  return PAYMENTS.filter((p) => p.status === "En attente" || p.status === "En retard")
    .map((p) => ({ ...p, clientCommercial: commercialByClient.get(p.clientName) ?? "" }))
    .filter((p) => !scope || p.clientCommercial === scope)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export interface MyMessage extends MessageRecord {
  clientCommercial: string;
}

export async function getMyRecentMessages(scope: string | null, limit = 6): Promise<MyMessage[]> {
  const clients = await getAllClients();
  const commercialByClient = new Map(clients.map((c) => [c.name, c.commercial]));

  return MESSAGES.map((m) => ({ ...m, clientCommercial: commercialByClient.get(m.clientName) ?? "" }))
    .filter((m) => !scope || m.clientCommercial === scope)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

export interface MyDevisDeadline {
  ref: string;
  clientName: string;
  validUntil: string;
  amount: number;
}

/** Payments actually collected (status "Payé") in the last 30 days, for a commercial's clients. */
export async function getMyRevenueLast30Days(scope: string | null): Promise<number> {
  const clients = await getAllClients();
  const commercialByClient = new Map(clients.map((c) => [c.name, c.commercial]));
  const cutoff = Date.now() - 30 * 86_400_000;

  return PAYMENTS.filter((p) => {
    if (p.status !== "Payé") return false;
    if (new Date(p.date).getTime() < cutoff) return false;
    if (scope && commercialByClient.get(p.clientName) !== scope) return false;
    return true;
  }).reduce((sum, p) => sum + p.amount, 0);
}

export async function getMyPipelineFunnel(scope: string | null): Promise<{ status: LeadStatus; count: number }[]> {
  const leads = await getAllLeads();
  const pool = scope ? leads.filter((l) => l.commercial === scope) : leads;
  return LEAD_STATUSES.map((status) => ({
    status,
    count: pool.filter((l) => l.status === status).length,
  }));
}

export interface AgendaEntry {
  id: string;
  date: string;
  title: string;
  subtitle: string;
  kind: "Rendez-vous" | "Tâche" | "Rappel" | "Devis";
  href: string;
}

/** Every dated, still-open item across a commercial's leads, appointments and devis, for the calendar view. */
export async function getMyAgenda(scope: string | null): Promise<AgendaEntry[]> {
  const interactions = await getMyInteractions(scope, {
    upcomingOnly: true,
    types: ["task", "reminder"],
  });

  const KIND_LABEL: Record<string, AgendaEntry["kind"]> = {
    task: "Tâche",
    reminder: "Rappel",
  };

  const fromInteractions: AgendaEntry[] = interactions.map((i) => ({
    id: i.id,
    date: i.dueDate!,
    title: i.title,
    subtitle: i.leadName,
    kind: KIND_LABEL[i.type],
    href: `/dashboard/leads/${i.leadId}`,
  }));

  const now = Date.now();
  const fromAppointments: AgendaEntry[] = APPOINTMENTS.filter((a) => {
    if (a.status === "Annulé" || a.status === "Terminé") return false;
    if (new Date(a.date).getTime() < now) return false;
    if (scope) return a.commercial === scope || a.commercial === null;
    return true;
  }).map((a) => ({
    id: a.id,
    date: a.date,
    title: a.title,
    subtitle: a.contactName,
    kind: "Rendez-vous",
    href: `/dashboard/rendez-vous/${a.id}`,
  }));

  const fromDevis: AgendaEntry[] = (await getMyExpiringDevis(scope)).map((d) => ({
    id: d.ref,
    date: d.validUntil,
    title: `Devis ${d.ref} expire`,
    subtitle: d.clientName,
    kind: "Devis",
    href: "/dashboard/devis",
  }));

  return [...fromInteractions, ...fromAppointments, ...fromDevis].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}

export async function getMyExpiringDevis(scope: string | null): Promise<MyDevisDeadline[]> {
  const devis = await getAllDevis();
  const now = Date.now();
  const in7Days = now + 7 * 86_400_000;

  return devis.filter((d) => {
    if (d.status !== "Envoyé" && d.status !== "Vu") return false;
    if (scope && d.commercial !== scope) return false;
    const t = new Date(d.validUntil).getTime();
    return t >= now - 30 * 86_400_000 && t <= in7Days;
  })
    .map((d) => ({ ref: d.ref, clientName: d.clientName, validUntil: d.validUntil, amount: d.amount }))
    .sort((a, b) => new Date(a.validUntil).getTime() - new Date(b.validUntil).getTime());
}
