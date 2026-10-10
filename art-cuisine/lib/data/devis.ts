import { eq } from "drizzle-orm";
import { getPgDb } from "@/lib/db/pg";
import { devis as devisTable, devisVersions as devisVersionsTable } from "@/lib/db/schema";
import {
  DEVIS_STATUSES,
  COMMERCIALS,
  type DevisRecord,
  type DevisStatus,
  type DevisVersionRecord,
} from "@/lib/data/operations";

export { DEVIS_STATUSES, COMMERCIALS };

async function getAllDevis(): Promise<DevisRecord[]> {
  const rows = await getPgDb().select().from(devisTable);
  return rows as DevisRecord[];
}

export interface DevisFilters {
  search?: string;
  status?: DevisStatus | "tous";
  commercial?: string | "tous";
}

/**
 * `scope` (a commercial's own name, or null for admins) restricts the list to
 * that commercial's own devis plus any unclaimed public configurator requests
 * — a shared inbox, same as the Appointments module. When `scope` is null the
 * explicit `commercial` filter applies instead.
 */
export async function filterDevis(filters: DevisFilters, scope: string | null = null): Promise<DevisRecord[]> {
  const devis = await getAllDevis();
  const search = filters.search?.trim().toLowerCase();

  return devis
    .filter((d) => {
      if (scope) {
        if (d.commercial !== scope && d.commercial !== null) return false;
      } else if (filters.commercial && filters.commercial !== "tous" && d.commercial !== filters.commercial) {
        return false;
      }
      if (search) {
        const haystack = `${d.ref} ${d.clientName} ${d.projectLabel}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      if (filters.status && filters.status !== "tous" && d.status !== filters.status) return false;
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getDevisById(id: string): Promise<DevisRecord | undefined> {
  const rows = await getPgDb().select().from(devisTable).where(eq(devisTable.id, id));
  return rows[0] as DevisRecord | undefined;
}

/** Devis id/label options for pickers, optionally scoped to a commercial and/or a single client. */
export async function getDevisOptions(scope: string | null = null, clientId?: string | null) {
  const devis = await getAllDevis();
  let pool = scope ? devis.filter((d) => d.commercial === scope || d.commercial === null) : devis;
  if (clientId) pool = pool.filter((d) => d.clientId === clientId);
  return pool
    .map((d) => ({ id: d.id, label: `${d.ref} — ${d.clientName}` }))
    .sort((a, b) => b.id.localeCompare(a.id));
}

/** All devis belonging to a given client, most recent first — for the client's own "Mes devis" workspace. */
export async function getDevisForClient(clientId: string): Promise<DevisRecord[]> {
  const devis = await getAllDevis();
  return devis
    .filter((d) => d.clientId === clientId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/** All devis matching a client's name — used by lib/data/clients.ts's cross-entity relations view. */
export async function getDevisForClientName(clientName: string): Promise<DevisRecord[]> {
  const devis = await getAllDevis();
  return devis
    .filter((d) => d.clientName === clientName)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/** Superseded snapshots of a quote's earlier versions, oldest first. */
export async function getDevisVersions(devisId: string): Promise<DevisVersionRecord[]> {
  const rows = await getPgDb().select().from(devisVersionsTable).where(eq(devisVersionsTable.devisId, devisId));
  return (rows as DevisVersionRecord[]).sort((a, b) => a.version - b.version);
}

/** Statuses a client may still act on (approve, refuse, or request changes). */
export function isDevisAwaitingClient(status: DevisStatus): boolean {
  return status === "Envoyé" || status === "Vu";
}

export async function nextRef(): Promise<string> {
  const devis = await getAllDevis();
  const year = new Date().getFullYear();
  const numbers = devis.map((d) => Number(d.ref.split("-").pop())).filter((n) => !Number.isNaN(n));
  const next = (numbers.length > 0 ? Math.max(...numbers) : 0) + 1;
  return `DEV-${year}-${String(next).padStart(3, "0")}`;
}

export interface DevisListStats {
  total: number;
  pending: number;
  unassigned: number;
  needsAttention: number;
  accepted: number;
  totalValue: number;
  acceptedValue: number;
  conversionRate: number;
}

export async function getDevisListStats(scope: string | null = null): Promise<DevisListStats> {
  const devis = await getAllDevis();
  const pool = scope ? devis.filter((d) => d.commercial === scope || d.commercial === null) : devis;

  const pending = pool.filter((d) => d.status === "Envoyé" || d.status === "Vu").length;
  const accepted = pool.filter((d) => d.status === "Accepté");
  const decided = pool.filter((d) => d.status === "Accepté" || d.status === "Refusé");

  return {
    total: pool.length,
    pending,
    unassigned: pool.filter((d) => d.commercial === null).length,
    needsAttention: pool.filter((d) => d.status === "Modification demandée").length,
    accepted: accepted.length,
    totalValue: pool.reduce((sum, d) => sum + d.amount, 0),
    acceptedValue: accepted.reduce((sum, d) => sum + d.amount, 0),
    conversionRate: decided.length > 0 ? Math.round((accepted.length / decided.length) * 100) : 0,
  };
}

export function isDevisExpiringSoon(validUntil: string): boolean {
  const days = (new Date(validUntil).getTime() - Date.now()) / 86_400_000;
  return days >= 0 && days <= 5;
}

export function isDevisExpired(validUntil: string): boolean {
  return new Date(validUntil).getTime() < Date.now();
}
