import { eq } from "drizzle-orm";
import { getPgDb } from "@/lib/db/pg";
import { devis as devisTable, devisLineItems as devisLineItemsTable } from "@/lib/db/schema";
import {
  CATALOGUE_ITEMS,
  CATALOGUE_CATEGORIES,
  CATALOGUE_UNITS,
  CATALOGUE_AVAILABILITY_STATUSES,
  PRICE_HISTORY,
  type CatalogueItemRecord,
  type CatalogueCategory,
  type CatalogueAvailability,
  type DevisLineItem,
  type DevisRecord,
  type DiscountType,
} from "@/lib/data/operations";

export { CATALOGUE_CATEGORIES, CATALOGUE_UNITS, CATALOGUE_AVAILABILITY_STATUSES };

export interface CatalogueFilters {
  search?: string;
  category?: CatalogueCategory | "toutes";
  availability?: CatalogueAvailability | "toutes";
  status?: "actifs" | "inactifs" | "tous";
}

export function filterCatalogue(filters: CatalogueFilters): CatalogueItemRecord[] {
  const search = filters.search?.trim().toLowerCase();

  return CATALOGUE_ITEMS.filter((item) => {
    if (search) {
      const haystack = `${item.name} ${item.sku} ${item.description}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    if (filters.category && filters.category !== "toutes" && item.category !== filters.category) return false;
    if (filters.availability && filters.availability !== "toutes" && item.availability !== filters.availability) return false;
    if (filters.status === "actifs" && !item.active) return false;
    if (filters.status === "inactifs" && item.active) return false;
    return true;
  }).sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}

/** The catalogue items chosen for a given project — see ProjectRecord.materialSelections. */
export function getCatalogueItemsByIds(ids: string[]): CatalogueItemRecord[] {
  const set = new Set(ids);
  return CATALOGUE_ITEMS.filter((i) => set.has(i.id));
}

export function getCatalogueItemById(id: string): CatalogueItemRecord | undefined {
  return CATALOGUE_ITEMS.find((i) => i.id === id);
}

/** Active items grouped by category, for the "add line" picker on a devis. */
export function getActiveCatalogueByCategory(): Record<CatalogueCategory, CatalogueItemRecord[]> {
  const grouped = Object.fromEntries(CATALOGUE_CATEGORIES.map((c) => [c, [] as CatalogueItemRecord[]])) as Record<
    CatalogueCategory,
    CatalogueItemRecord[]
  >;
  for (const item of CATALOGUE_ITEMS) {
    if (item.active) grouped[item.category].push(item);
  }
  return grouped;
}

export function getPriceHistoryForItem(itemId: string) {
  return PRICE_HISTORY.filter((h) => h.itemId === itemId).sort(
    (a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime(),
  );
}

export interface CatalogueListStats {
  total: number;
  active: number;
  categories: number;
  averagePrice: number;
}

export function getCatalogueListStats(): CatalogueListStats {
  const active = CATALOGUE_ITEMS.filter((i) => i.active);
  return {
    total: CATALOGUE_ITEMS.length,
    active: active.length,
    categories: new Set(CATALOGUE_ITEMS.map((i) => i.category)).size,
    averagePrice: active.length > 0 ? Math.round(active.reduce((sum, i) => sum + i.unitPrice, 0) / active.length) : 0,
  };
}

export async function getLineItemsForDevis(devisId: string): Promise<DevisLineItem[]> {
  const rows = await getPgDb().select().from(devisLineItemsTable).where(eq(devisLineItemsTable.devisId, devisId));
  return rows as DevisLineItem[];
}

export interface DevisTotals {
  subtotal: number;
  discountAmount: number;
  afterDiscount: number;
  taxAmount: number;
  total: number;
  depositAmount: number;
  remainingBalance: number;
}

export interface DevisPricingTerms {
  discountType: DiscountType | null;
  discountValue: number;
  taxRate: number;
  depositPercent: number;
}

/**
 * The single source of truth for "quantity × unit price + services + options
 * − discounts = total": every line (goods, services like Vernissage/Montage/
 * Transport, and options like Accessoires) is summed the same way, then the
 * devis-level discount, tax and deposit terms are applied in sequence.
 */
export function computeDevisTotals(terms: DevisPricingTerms, lines: DevisLineItem[]): DevisTotals {
  const subtotal = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);

  let discountAmount = 0;
  if (terms.discountType === "Pourcentage") {
    discountAmount = subtotal * (terms.discountValue / 100);
  } else if (terms.discountType === "Montant fixe") {
    discountAmount = terms.discountValue;
  }
  discountAmount = Math.min(Math.max(discountAmount, 0), subtotal);

  const afterDiscount = subtotal - discountAmount;
  const taxAmount = afterDiscount * (terms.taxRate / 100);
  const total = afterDiscount + taxAmount;
  const depositAmount = total * (terms.depositPercent / 100);
  const remainingBalance = total - depositAmount;

  return {
    subtotal: Math.round(subtotal),
    discountAmount: Math.round(discountAmount),
    afterDiscount: Math.round(afterDiscount),
    taxAmount: Math.round(taxAmount),
    total: Math.round(total),
    depositAmount: Math.round(depositAmount),
    remainingBalance: Math.round(remainingBalance),
  };
}

/** Convenience wrapper reading pricing terms straight off a devis. */
export function computeDevisTotalsFor(devis: DevisRecord, lines: DevisLineItem[]): DevisTotals {
  return computeDevisTotals(
    {
      discountType: devis.discountType,
      discountValue: devis.discountValue,
      taxRate: devis.taxRate,
      depositPercent: devis.depositPercent,
    },
    lines,
  );
}

/**
 * Recomputes and persists `devis.amount` from its current line items and
 * pricing terms. A devis with no line items yet keeps whatever amount was
 * typed manually — the pricing engine only takes over once it's used.
 */
export async function recomputeDevisAmount(devisId: string): Promise<void> {
  const rows = await getPgDb().select().from(devisTable).where(eq(devisTable.id, devisId));
  const devis = rows[0] as DevisRecord | undefined;
  if (!devis) return;
  const lines = await getLineItemsForDevis(devisId);
  if (lines.length === 0) return;
  const amount = computeDevisTotalsFor(devis, lines).total;
  await getPgDb().update(devisTable).set({ amount }).where(eq(devisTable.id, devisId));
}
