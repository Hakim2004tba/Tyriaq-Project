import { eq } from "drizzle-orm";
import { getPgDb } from "@/lib/db/pg";
import { leads as leadsTable, leadInteractions as leadInteractionsTable } from "@/lib/db/schema";
import {
  LEAD_STATUSES,
  LEAD_SOURCES,
  PROJECT_TYPES,
  COMMERCIALS,
  BUDGET_RANGES,
  isFollowUpOverdue,
  type LeadRecord,
  type LeadStatus,
  type LeadSource,
  type LeadInteractionRecord,
} from "@/lib/data/operations";

export { LEAD_STATUSES, LEAD_SOURCES, PROJECT_TYPES, COMMERCIALS, BUDGET_RANGES, isFollowUpOverdue };

export const OPEN_STATUSES: LeadStatus[] = LEAD_STATUSES.filter(
  (s) => s !== "Gagné" && s !== "Perdu",
);

async function getAllLeads(): Promise<LeadRecord[]> {
  const rows = await getPgDb().select().from(leadsTable);
  return rows as LeadRecord[];
}

export interface LeadFilters {
  search?: string;
  source?: LeadSource | "tous";
  commercial?: string | "tous";
  projectType?: string | "tous";
  budgetRange?: string | "tous";
}

export async function filterLeads(filters: LeadFilters): Promise<LeadRecord[]> {
  const leads = await getAllLeads();
  const search = filters.search?.trim().toLowerCase();
  const range = BUDGET_RANGES.find((r) => r.value === filters.budgetRange);

  return leads
    .filter((lead) => {
      if (search) {
        const haystack = `${lead.name} ${lead.email} ${lead.phone} ${lead.city}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      if (filters.source && filters.source !== "tous" && lead.source !== filters.source) return false;
      if (filters.commercial && filters.commercial !== "tous" && lead.commercial !== filters.commercial) return false;
      if (filters.projectType && filters.projectType !== "tous" && lead.projectType !== filters.projectType) return false;
      if (range && (lead.budget < range.min || lead.budget >= range.max)) return false;
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getLeadsByStatus(leads: LeadRecord[]): Record<LeadStatus, LeadRecord[]> {
  const grouped = Object.fromEntries(LEAD_STATUSES.map((s) => [s, [] as LeadRecord[]])) as Record<
    LeadStatus,
    LeadRecord[]
  >;
  for (const lead of leads) {
    grouped[lead.status].push(lead);
  }
  return grouped;
}

export async function getLeadById(id: string): Promise<LeadRecord | undefined> {
  const rows = await getPgDb().select().from(leadsTable).where(eq(leadsTable.id, id));
  return rows[0] as LeadRecord | undefined;
}

/** Lead id/name/phone/email options for pickers, optionally scoped to a commercial. */
export async function getLeadOptions(scope: string | null = null) {
  const leads = await getAllLeads();
  const pool = scope ? leads.filter((l) => l.commercial === scope) : leads;
  return pool
    .map((l) => ({ id: l.id, name: l.name, phone: l.phone, email: l.email }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export interface LeadListStats {
  total: number;
  newThisWeek: number;
  pipelineValue: number;
  conversionRate: number;
}

export async function getLeadListStats(scope: string | null = null): Promise<LeadListStats> {
  const leads = await getAllLeads();
  const now = Date.now();
  const sevenDays = 7 * 86_400_000;
  const pool = scope ? leads.filter((l) => l.commercial === scope) : leads;

  const newThisWeek = pool.filter((l) => now - new Date(l.createdAt).getTime() <= sevenDays).length;
  const open = pool.filter((l) => l.status !== "Gagné" && l.status !== "Perdu");
  const pipelineValue = open.reduce((sum, l) => sum + l.budget, 0);
  const closed = pool.filter((l) => l.status === "Gagné" || l.status === "Perdu");
  const won = pool.filter((l) => l.status === "Gagné").length;
  const conversionRate = closed.length > 0 ? Math.round((won / closed.length) * 100) : 0;

  return { total: pool.length, newThisWeek, pipelineValue, conversionRate };
}

export async function getLeadInteractions(leadId: string): Promise<LeadInteractionRecord[]> {
  const rows = (await getPgDb().select().from(leadInteractionsTable).where(eq(leadInteractionsTable.leadId, leadId))) as LeadInteractionRecord[];
  return rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getUpcomingItems(leadId: string): Promise<LeadInteractionRecord[]> {
  const rows = (await getPgDb().select().from(leadInteractionsTable).where(eq(leadInteractionsTable.leadId, leadId))) as LeadInteractionRecord[];
  return rows
    .filter((i) => i.dueDate && !i.completed && (i.type === "task" || i.type === "reminder" || i.type === "appointment"))
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
}
