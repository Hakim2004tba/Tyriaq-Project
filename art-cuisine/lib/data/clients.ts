import { eq } from "drizzle-orm";
import { getPgDb } from "@/lib/db/pg";
import { clients as clientsTable } from "@/lib/db/schema";
import {
  PROJECTS,
  PAYMENTS,
  SAV_TICKETS,
  DOCUMENTS,
  MESSAGES,
  ACTIVITY,
  COMMERCIALS,
  CLIENT_STATUSES,
  type ClientRecord,
  type ClientStatus,
} from "@/lib/data/operations";
import { getDevisForClientName } from "@/lib/data/devis";

export type { ClientRecord };
export { COMMERCIALS, CLIENT_STATUSES };

async function getAllClients(): Promise<ClientRecord[]> {
  const rows = await getPgDb().select().from(clientsTable);
  return rows as ClientRecord[];
}

export async function getCities(): Promise<string[]> {
  const clients = await getAllClients();
  return Array.from(new Set(clients.map((c) => c.city))).sort((a, b) => a.localeCompare(b));
}

/** Client names available to build a devis/lead against, optionally scoped to a commercial. */
export async function getClientNames(scope: string | null = null): Promise<string[]> {
  const clients = await getAllClients();
  const pool = scope ? clients.filter((c) => c.commercial === scope) : clients;
  return pool.map((c) => c.name).sort((a, b) => a.localeCompare(b));
}

/** Client id/name/phone/email options for pickers, optionally scoped to a commercial. */
export async function getClientOptions(scope: string | null = null) {
  const clients = await getAllClients();
  const pool = scope ? clients.filter((c) => c.commercial === scope) : clients;
  return pool
    .map((c) => ({ id: c.id, name: c.name, phone: c.phone, email: c.email }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export interface ClientFilters {
  search?: string;
  status?: ClientStatus | "tous";
  commercial?: string | "tous";
  city?: string | "tous";
}

export async function filterClients(filters: ClientFilters): Promise<ClientRecord[]> {
  const clients = await getAllClients();
  const search = filters.search?.trim().toLowerCase();

  return clients
    .filter((c) => {
      if (search) {
        const haystack = `${c.name} ${c.email} ${c.phone} ${c.city}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      if (filters.status && filters.status !== "tous" && c.status !== filters.status) return false;
      if (filters.commercial && filters.commercial !== "tous" && c.commercial !== filters.commercial) return false;
      if (filters.city && filters.city !== "tous" && c.city !== filters.city) return false;
      return true;
    })
    .sort((a, b) => new Date(b.since).getTime() - new Date(a.since).getTime());
}

export async function getClientById(id: string): Promise<ClientRecord | undefined> {
  const rows = await getPgDb().select().from(clientsTable).where(eq(clientsTable.id, id));
  return rows[0] as ClientRecord | undefined;
}

/** Resolves the Client record behind a logged-in "client"-role account, matched by their login email. */
export async function getClientByEmail(email: string): Promise<ClientRecord | undefined> {
  const clients = await getAllClients();
  return clients.find((c) => c.email.toLowerCase() === email.toLowerCase());
}

/** Client id → owning commercial, for scoping records (like Documents) that only store a clientId. */
export async function getClientCommercialMap(): Promise<Map<string, string>> {
  const clients = await getAllClients();
  return new Map(clients.map((c) => [c.id, c.commercial]));
}

export function getMessagesForClient(clientName: string) {
  return MESSAGES.filter((m) => m.clientName === clientName).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
}

export function getClientFinancials(clientName: string) {
  const clientProjects = PROJECTS.filter((p) => p.clientName === clientName);
  const clientPayments = PAYMENTS.filter((p) => p.clientName === clientName);

  const totalSpent = clientPayments
    .filter((p) => p.status === "Payé")
    .reduce((sum, p) => sum + p.amount, 0);
  const pendingAmount = clientPayments
    .filter((p) => p.status === "En attente")
    .reduce((sum, p) => sum + p.amount, 0);
  const overdueAmount = clientPayments
    .filter((p) => p.status === "En retard")
    .reduce((sum, p) => sum + p.amount, 0);

  return {
    totalSpent,
    pendingAmount,
    overdueAmount,
    activeProjects: clientProjects.filter((p) => p.stage !== "Terminé").length,
    totalProjects: clientProjects.length,
  };
}

export interface ClientListStats {
  total: number;
  active: number;
  vip: number;
  atRisk: number;
  newThisMonth: number;
}

export async function getClientListStats(scope: string | null = null): Promise<ClientListStats> {
  const clients = await getAllClients();
  const now = Date.now();
  const thirtyDays = 30 * 86_400_000;
  const pool = scope ? clients.filter((c) => c.commercial === scope) : clients;

  return {
    total: pool.length,
    active: pool.filter((c) => c.status === "Actif" || c.status === "VIP").length,
    vip: pool.filter((c) => c.status === "VIP").length,
    atRisk: pool.filter((c) => c.status === "Inactif").length,
    newThisMonth: pool.filter((c) => now - new Date(c.since).getTime() <= thirtyDays).length,
  };
}

export async function getClientRelations(clientName: string) {
  return {
    projects: PROJECTS.filter((p) => p.clientName === clientName).sort(
      (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
    ),
    devis: await getDevisForClientName(clientName),
    payments: PAYMENTS.filter((p) => p.clientName === clientName).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    ),
    savTickets: SAV_TICKETS.filter((t) => t.clientName === clientName).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ),
    documents: DOCUMENTS.filter((d) => d.clientName === clientName).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    ),
    messages: MESSAGES.filter((m) => m.clientName === clientName).sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    ),
    activity: ACTIVITY.filter((a) => a.clientName === clientName).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    ),
  };
}
