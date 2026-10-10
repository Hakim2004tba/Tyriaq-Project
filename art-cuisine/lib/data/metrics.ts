import { getPgDb } from "@/lib/db/pg";
import { leads as leadsTable, clients as clientsTable, devis as devisTable } from "@/lib/db/schema";
import {
  PROJECTS,
  PAYMENTS,
  SAV_TICKETS,
  TASKS,
  ACTIVITY,
  NOTIFICATIONS,
  PERIOD_OPTIONS,
  type PeriodKey,
  type LeadRecord,
  type ClientRecord,
  type DevisRecord,
  type ProjectStage,
  type ProjectRecord,
} from "@/lib/data/operations";

export { PERIOD_OPTIONS, type PeriodKey };

export function isPeriodKey(value: string | undefined): value is PeriodKey {
  return !!value && PERIOD_OPTIONS.some((o) => o.value === value);
}

function periodDays(period: PeriodKey): number | null {
  switch (period) {
    case "7j":
      return 7;
    case "30j":
      return 30;
    case "90j":
      return 90;
    case "annee":
      return 365;
    case "tout":
      return null;
  }
}

function windowBounds(period: PeriodKey): { from: number; prevFrom: number } | null {
  const days = periodDays(period);
  if (days === null) return null;
  const msPerDay = 86_400_000;
  const from = Date.now() - days * msPerDay;
  const prevFrom = from - days * msPerDay;
  return { from, prevFrom };
}

function inCurrentWindow(iso: string, period: PeriodKey): boolean {
  const bounds = windowBounds(period);
  if (!bounds) return true;
  return new Date(iso).getTime() >= bounds.from;
}

function inPreviousWindow(iso: string, period: PeriodKey): boolean {
  const bounds = windowBounds(period);
  if (!bounds) return false;
  const t = new Date(iso).getTime();
  return t >= bounds.prevFrom && t < bounds.from;
}

export function trendFrom(current: number, previous: number): { value: string; direction: "up" | "down" } | undefined {
  if (previous === 0 && current === 0) return undefined;
  if (previous === 0) return { value: "+100%", direction: "up" };
  const pct = Math.round(((current - previous) / previous) * 100);
  return {
    value: `${pct >= 0 ? "+" : ""}${pct}%`,
    direction: pct >= 0 ? "up" : "down",
  };
}

// --- Revenue ----------------------------------------------------------------

export function getRevenueMetrics(period: PeriodKey) {
  const collected = PAYMENTS.filter((p) => p.status === "Payé" && inCurrentWindow(p.date, period))
    .reduce((sum, p) => sum + p.amount, 0);
  const collectedPrev = PAYMENTS.filter((p) => p.status === "Payé" && inPreviousWindow(p.date, period))
    .reduce((sum, p) => sum + p.amount, 0);

  return {
    collected,
    trend: trendFrom(collected, collectedPrev),
  };
}

// --- Leads --------------------------------------------------------------------

export async function getLeadsMetrics(period: PeriodKey) {
  const leads = (await getPgDb().select().from(leadsTable)) as LeadRecord[];
  const current = leads.filter((l) => inCurrentWindow(l.createdAt, period));
  const previous = leads.filter((l) => inPreviousWindow(l.createdAt, period));

  const byStatus = current.reduce<Record<string, number>>((acc, l) => {
    acc[l.status] = (acc[l.status] ?? 0) + 1;
    return acc;
  }, {});

  return {
    total: current.length,
    trend: trendFrom(current.length, previous.length),
    byStatus,
    won: current.filter((l) => l.status === "Gagné").length,
  };
}

// --- Clients --------------------------------------------------------------------

export async function getClientsMetrics(period: PeriodKey) {
  const clients = (await getPgDb().select().from(clientsTable)) as ClientRecord[];
  const newCurrent = clients.filter((c) => inCurrentWindow(c.since, period)).length;
  const newPrevious = clients.filter((c) => inPreviousWindow(c.since, period)).length;

  return {
    total: clients.length,
    newInPeriod: newCurrent,
    trend: trendFrom(newCurrent, newPrevious),
  };
}

// --- Devis --------------------------------------------------------------------

export async function getDevisMetrics(period: PeriodKey) {
  const devis = (await getPgDb().select().from(devisTable)) as DevisRecord[];
  const current = devis.filter((d) => inCurrentWindow(d.createdAt, period));
  const previous = devis.filter((d) => inPreviousWindow(d.createdAt, period));

  const accepted = current.filter((d) => d.status === "Accepté");
  const acceptedPrev = previous.filter((d) => d.status === "Accepté");

  const sentAmount = current.reduce((sum, d) => sum + d.amount, 0);
  const acceptedAmount = accepted.reduce((sum, d) => sum + d.amount, 0);

  return {
    total: current.length,
    trend: trendFrom(current.length, previous.length),
    sentAmount,
    accepted: {
      count: accepted.length,
      amount: acceptedAmount,
      trend: trendFrom(accepted.length, acceptedPrev.length),
    },
    conversionRate: current.length > 0 ? Math.round((accepted.length / current.length) * 100) : 0,
  };
}

// --- Projects / production pipeline -------------------------------------------

export { PROJECT_STAGES as STAGES } from "@/lib/data/operations";

export function getProjectsByStage(): Record<ProjectStage, ProjectRecord[]> {
  const grouped: Record<ProjectStage, ProjectRecord[]> = {
    Conception: [],
    "Validation client": [],
    Production: [],
    Vernissage: [],
    "Contrôle qualité": [],
    Montage: [],
    Réception: [],
    Terminé: [],
  };
  for (const project of PROJECTS) {
    grouped[project.stage].push(project);
  }
  return grouped;
}

export function getActiveProjectsCount(): number {
  return PROJECTS.filter((p) => p.stage !== "Terminé").length;
}

export function getDelayedProjects(): ProjectRecord[] {
  const now = Date.now();
  return PROJECTS.filter((p) => p.stage !== "Terminé" && new Date(p.dueDate).getTime() < now).sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
  );
}

export function daysLate(dueDate: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(dueDate).getTime()) / 86_400_000));
}

/** Pure helper so components never call `Date.now()` directly during render. */
export function isOverdue(dateIso: string): boolean {
  return new Date(dateIso).getTime() < Date.now();
}

// --- Payments -------------------------------------------------------------------

export function getPaymentsMetrics(period: PeriodKey) {
  const pending = PAYMENTS.filter((p) => p.status === "En attente");
  const overdue = PAYMENTS.filter((p) => p.status === "En retard");
  const recent = PAYMENTS.filter((p) => inCurrentWindow(p.date, period)).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return {
    pendingAmount: pending.reduce((sum, p) => sum + p.amount, 0),
    pendingCount: pending.length,
    overdueAmount: overdue.reduce((sum, p) => sum + p.amount, 0),
    overdueCount: overdue.length,
    recent,
  };
}

// --- SAV --------------------------------------------------------------------

export function getSavMetrics() {
  const open = SAV_TICKETS.filter((t) => t.status !== "Résolu");
  const urgent = open.filter((t) => t.priority === "Urgente");

  return {
    openCount: open.length,
    urgentCount: urgent.length,
    list: [...open].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
  };
}

// --- Tasks --------------------------------------------------------------------

export function getTasksMetrics() {
  const pending = TASKS.filter((t) => t.status !== "Terminée");
  const overdue = pending.filter((t) => new Date(t.dueDate).getTime() < Date.now());

  return {
    pendingCount: pending.length,
    overdueCount: overdue.length,
    list: [...pending].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()),
  };
}

// --- Activity & notifications ---------------------------------------------------

export function getRecentActivity(period: PeriodKey, limit = 8) {
  return ACTIVITY.filter((a) => inCurrentWindow(a.timestamp, period))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

export function getNotifications() {
  return [...NOTIFICATIONS].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
