import { getPgDb } from "@/lib/db/pg";
import { devis as devisTable } from "@/lib/db/schema";
import {
  PAYMENTS,
  PAYMENT_METHODS,
  PROJECTS,
  type DevisRecord,
  type PaymentRecord,
  type PaymentStatus,
  type PaymentMethod,
  type ProjectRecord,
} from "@/lib/data/operations";

async function getAllDevis(): Promise<DevisRecord[]> {
  const rows = await getPgDb().select().from(devisTable);
  return rows as DevisRecord[];
}
import { getLineItemsForDevis, computeDevisTotalsFor } from "@/lib/data/pricing";
import { getDevisById } from "@/lib/data/devis";

export { PAYMENT_METHODS };

export const PAYMENT_STATUS_BADGE: Record<PaymentStatus, "success" | "warning" | "danger"> = {
  Payé: "success",
  "En attente": "warning",
  "En retard": "danger",
};

/** A pending payment past its expected date is overdue even if nobody flipped its status yet. */
export function isPaymentOverdue(payment: Pick<PaymentRecord, "status" | "date">): boolean {
  return payment.status === "En retard" || (payment.status === "En attente" && new Date(payment.date).getTime() < Date.now());
}

/** The status to display — promotes an overdue "En attente" payment to "En retard" without mutating the stored record. */
export function getPaymentDisplayStatus(payment: Pick<PaymentRecord, "status" | "date">): PaymentStatus {
  return isPaymentOverdue(payment) ? "En retard" : payment.status;
}

export function getPaymentById(id: string): PaymentRecord | undefined {
  return PAYMENTS.find((p) => p.id === id);
}

export function getPaymentsForProject(projectRef: string): PaymentRecord[] {
  return PAYMENTS.filter((p) => p.projectRef === projectRef).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getPaymentsForDevis(devisId: string): PaymentRecord[] {
  return PAYMENTS.filter((p) => p.devisId === devisId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getPaymentsForClient(clientId: string): PaymentRecord[] {
  return PAYMENTS.filter((p) => p.clientId === clientId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export interface ProjectFinancials {
  total: number;
  depositAmount: number;
  paid: number;
  remaining: number;
  overdueAmount: number;
  status: "Soldé" | "En retard" | "À jour";
  payments: PaymentRecord[];
}

/**
 * The full financial picture for a project — total and deposit come from its
 * devis pricing when one is linked (falling back to a flat 30% deposit
 * convention otherwise), reconciled against the payments actually recorded
 * against it.
 */
export async function getProjectFinancials(project: Pick<ProjectRecord, "ref" | "amount" | "devisId">): Promise<ProjectFinancials> {
  const devis = project.devisId ? await getDevisById(project.devisId) : undefined;
  let total = project.amount;
  let depositAmount = Math.round(project.amount * 0.3);

  if (devis) {
    const lines = await getLineItemsForDevis(devis.id);
    if (lines.length > 0) {
      const totals = computeDevisTotalsFor(devis, lines);
      total = totals.total;
      depositAmount = totals.depositAmount;
    } else {
      total = devis.amount;
      depositAmount = Math.round(devis.amount * (devis.depositPercent / 100));
    }
  }

  const payments = getPaymentsForProject(project.ref);
  const paid = payments.filter((p) => p.status === "Payé").reduce((sum, p) => sum + p.amount, 0);
  const remaining = Math.max(total - paid, 0);
  const overdueAmount = payments.filter(isPaymentOverdue).reduce((sum, p) => sum + p.amount, 0);

  const status: ProjectFinancials["status"] = remaining <= 0 ? "Soldé" : overdueAmount > 0 ? "En retard" : "À jour";

  return { total, depositAmount, paid, remaining, overdueAmount, status, payments };
}

export const FINANCIAL_STATUS_BADGE: Record<ProjectFinancials["status"], "success" | "info" | "danger"> = {
  Soldé: "success",
  "À jour": "info",
  "En retard": "danger",
};

export interface PaymentTargetOption {
  /** `project:<id>` or `devis:<id>` — parsed by the create-payment action. */
  value: string;
  label: string;
}

/**
 * Every project, plus every accepted devis that hasn't become a project yet
 * — the combined picker for "what is this payment against", since a deposit
 * is sometimes collected before the project record exists.
 */
export async function getPaymentTargetOptions(scope: string | null = null): Promise<PaymentTargetOption[]> {
  const projectPool = scope ? PROJECTS.filter((p) => p.commercial === scope) : PROJECTS;
  const projectOptions: PaymentTargetOption[] = projectPool.map((p) => ({
    value: `project:${p.id}`,
    label: `${p.ref} — ${p.name} (${p.clientName})`,
  }));

  const devis = await getAllDevis();
  const devisPool = devis.filter((d) => d.status === "Accepté" && !d.projectRef && (!scope || d.commercial === scope));
  const devisOptions: PaymentTargetOption[] = devisPool.map((d) => ({
    value: `devis:${d.id}`,
    label: `${d.ref} — ${d.projectLabel} (${d.clientName}) · devis`,
  }));

  return [...projectOptions, ...devisOptions].sort((a, b) => a.label.localeCompare(b.label));
}

export interface PaymentFilters {
  search?: string;
  method?: PaymentMethod | "tous";
  status?: PaymentStatus | "tous";
}

export async function filterPayments(filters: PaymentFilters, scope: string | null = null): Promise<PaymentRecord[]> {
  const search = filters.search?.trim().toLowerCase();
  const devis = await getAllDevis();
  const commercialByProjectRef = new Map(PROJECTS.map((p) => [p.ref, p.commercial] as const));
  const commercialByDevisId = new Map(devis.map((d) => [d.id, d.commercial] as const));

  return PAYMENTS.filter((p) => {
    if (scope) {
      const commercial = p.projectRef ? commercialByProjectRef.get(p.projectRef) : p.devisId ? commercialByDevisId.get(p.devisId) : null;
      if (commercial !== scope) return false;
    }
    if (search) {
      const haystack = `${p.id} ${p.clientName} ${p.projectRef ?? ""} ${p.label}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    if (filters.method && filters.method !== "tous" && p.method !== filters.method) return false;
    if (filters.status && filters.status !== "tous" && getPaymentDisplayStatus(p) !== filters.status) return false;
    return true;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export interface FinanceListStats {
  totalCollected: number;
  pendingAmount: number;
  pendingCount: number;
  overdueAmount: number;
  overdueCount: number;
}

export async function getFinanceListStats(scope: string | null = null): Promise<FinanceListStats> {
  const pool = await filterPayments({}, scope);
  const pending = pool.filter((p) => getPaymentDisplayStatus(p) === "En attente");
  const overdue = pool.filter((p) => getPaymentDisplayStatus(p) === "En retard");

  return {
    totalCollected: pool.filter((p) => p.status === "Payé").reduce((sum, p) => sum + p.amount, 0),
    pendingAmount: pending.reduce((sum, p) => sum + p.amount, 0),
    pendingCount: pending.length,
    overdueAmount: overdue.reduce((sum, p) => sum + p.amount, 0),
    overdueCount: overdue.length,
  };
}

export function nextPaymentId(): string {
  const numbers = PAYMENTS.map((p) => Number(p.id.split("-").pop())).filter((n) => !Number.isNaN(n));
  const next = (numbers.length > 0 ? Math.max(...numbers) : 0) + 1;
  return `PAY-${next}`;
}
