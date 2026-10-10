import {
  PRODUCTION_ORDERS,
  PRODUCTION_PIECES,
  PRODUCTION_CHECKLIST_ITEMS,
  QUALITY_CONTROLS,
  PRODUCTION_STAGES,
  PRODUCTION_STAGE_PROGRESS,
  WORKSHOP_TEAM,
  PIECE_STATUSES,
  ACTIVITY,
  PROJECTS,
  type ProductionOrderRecord,
  type ProductionStage,
  type ProductionPieceRecord,
  type ProductionChecklistItemRecord,
  type QualityControlRecord,
  type ActivityRecord,
} from "@/lib/data/operations";

export { PRODUCTION_STAGES, PRODUCTION_STAGE_PROGRESS, WORKSHOP_TEAM, PIECE_STATUSES };

export interface ProjectOption {
  id: string;
  ref: string;
  label: string;
}

/** Projects whose design is validated and that don't already have an order in progress — eligible for a new production order. */
export function getEligibleProjectOptions(scope: string | null = null): ProjectOption[] {
  const pool = scope ? PROJECTS.filter((p) => p.commercial === scope) : PROJECTS;
  return pool
    .filter((p) => p.designStatus === "Validé")
    .map((p) => ({ id: p.id, ref: p.ref, label: `${p.ref} — ${p.name} (${p.clientName})` }))
    .sort((a, b) => a.ref.localeCompare(b.ref));
}

export const PRODUCTION_STAGE_BADGE: Record<ProductionStage, "neutral" | "info" | "warning" | "gold" | "success" | "danger"> = {
  "À préparer": "neutral",
  Découpe: "info",
  Usinage: "info",
  Assemblage: "warning",
  "Contrôle qualité": "gold",
  "Prêt pour vernissage": "success",
};

export function getProductionOrderById(id: string): ProductionOrderRecord | undefined {
  return PRODUCTION_ORDERS.find((o) => o.id === id);
}

export function getProductionOrdersForProject(projectRef: string): ProductionOrderRecord[] {
  return PRODUCTION_ORDERS.filter((o) => o.projectRef === projectRef).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function getActiveProductionOrderForProject(projectRef: string): ProductionOrderRecord | undefined {
  return getProductionOrdersForProject(projectRef).find((o) => o.stage !== "Prêt pour vernissage") ?? getProductionOrdersForProject(projectRef)[0];
}

export function getPiecesForOrder(orderId: string): ProductionPieceRecord[] {
  return PRODUCTION_PIECES.filter((p) => p.orderId === orderId);
}

export function getChecklistForOrder(orderId: string): ProductionChecklistItemRecord[] {
  return PRODUCTION_CHECKLIST_ITEMS.filter((c) => c.orderId === orderId);
}

export function getQualityControlsForOrder(orderId: string): QualityControlRecord[] {
  return QUALITY_CONTROLS.filter((q) => q.orderId === orderId).sort(
    (a, b) => new Date(b.checkedAt).getTime() - new Date(a.checkedAt).getTime(),
  );
}

export function getReworkCount(orderId: string): number {
  return QUALITY_CONTROLS.filter((q) => q.orderId === orderId && q.result === "Non conforme").length;
}

/** Production-category activity entries mentioning this order's ref — its history log. */
export function getActivityForOrder(orderRef: string): ActivityRecord[] {
  return ACTIVITY.filter((a) => a.category === "production" && a.message.includes(orderRef)).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

export interface ProductionFilters {
  search?: string;
  stage?: ProductionStage | "toutes";
}

export function filterProductionOrders(filters: ProductionFilters, scope: string | null, commercialByProjectRef: Map<string, string | null>): ProductionOrderRecord[] {
  const search = filters.search?.trim().toLowerCase();

  return PRODUCTION_ORDERS.filter((o) => {
    if (scope) {
      const commercial = commercialByProjectRef.get(o.projectRef);
      if (commercial !== scope) return false;
    }
    if (search) {
      const haystack = `${o.ref} ${o.projectRef} ${o.clientName}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    if (filters.stage && filters.stage !== "toutes" && o.stage !== filters.stage) return false;
    return true;
  }).sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
}

export interface ProductionListStats {
  total: number;
  inProgress: number;
  inQualityControl: number;
  readyForVernissage: number;
  overdue: number;
}

export function getProductionListStats(scope: string | null, commercialByProjectRef: Map<string, string | null>): ProductionListStats {
  const pool = scope ? PRODUCTION_ORDERS.filter((o) => commercialByProjectRef.get(o.projectRef) === scope) : PRODUCTION_ORDERS;
  const now = Date.now();

  return {
    total: pool.length,
    inProgress: pool.filter((o) => o.stage !== "Prêt pour vernissage").length,
    inQualityControl: pool.filter((o) => o.stage === "Contrôle qualité").length,
    readyForVernissage: pool.filter((o) => o.stage === "Prêt pour vernissage").length,
    overdue: pool.filter((o) => o.stage !== "Prêt pour vernissage" && new Date(o.deadline).getTime() < now).length,
  };
}

export function isProductionOrderOverdue(order: Pick<ProductionOrderRecord, "stage" | "deadline">): boolean {
  return order.stage !== "Prêt pour vernissage" && new Date(order.deadline).getTime() < Date.now();
}

export function nextProductionOrderRef(): string {
  const year = new Date().getFullYear();
  const numbers = PRODUCTION_ORDERS.map((o) => Number(o.ref.split("-").pop())).filter((n) => !Number.isNaN(n));
  const next = (numbers.length > 0 ? Math.max(...numbers) : 0) + 1;
  return `OF-${year}-${String(next).padStart(3, "0")}`;
}
