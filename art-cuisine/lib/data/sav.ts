import { SAV_TICKETS, type SavRecord, type SavPriority, type SavStatus } from "@/lib/data/operations";

export function getSavTicketById(id: string): SavRecord | undefined {
  return SAV_TICKETS.find((t) => t.id === id);
}

export function getSavTicketsForClient(clientId: string): SavRecord[] {
  return SAV_TICKETS.filter((t) => t.clientId === clientId).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export interface SavFilters {
  search?: string;
  status?: SavStatus | "tous";
  priority?: SavPriority | "toutes";
}

export function filterSavTickets(filters: SavFilters): SavRecord[] {
  const search = filters.search?.trim().toLowerCase();

  return SAV_TICKETS.filter((t) => {
    if (search) {
      const haystack = `${t.ref} ${t.clientName} ${t.issue} ${t.projectRef}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    if (filters.status && filters.status !== "tous" && t.status !== filters.status) return false;
    if (filters.priority && filters.priority !== "toutes" && t.priority !== filters.priority) return false;
    return true;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export interface SavListStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
}

export function getSavListStats(): SavListStats {
  return {
    total: SAV_TICKETS.length,
    open: SAV_TICKETS.filter((t) => t.status === "Ouvert").length,
    inProgress: SAV_TICKETS.filter((t) => t.status === "Planifié" || t.status === "En cours").length,
    resolved: SAV_TICKETS.filter((t) => t.status === "Résolu").length,
  };
}

export function nextSavRef(): string {
  const numbers = SAV_TICKETS.map((t) => Number(t.ref.replace("SAV-", ""))).filter((n) => !Number.isNaN(n));
  const next = (numbers.length > 0 ? Math.max(...numbers) : 0) + 1;
  return `SAV-${String(next).padStart(4, "0")}`;
}
