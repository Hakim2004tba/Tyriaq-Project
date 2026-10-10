"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { requirePermission } from "@/lib/auth/session";
import { getPgDb } from "@/lib/db/pg";
import { devisLineItems as devisLineItemsTable, devis as devisTable } from "@/lib/db/schema";
import { CATALOGUE_CATEGORIES, CATALOGUE_UNITS } from "@/lib/data/operations";
import { getDevisById } from "@/lib/data/devis";
import { getCatalogueItemById, recomputeDevisAmount } from "@/lib/data/pricing";
import { getOwnerScope } from "@/lib/data/scope";

type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

function canManage(scope: string | null, commercial: string | null): boolean {
  return !scope || commercial === null || commercial === scope;
}

async function requireManageableDevis(devisId: string) {
  const user = await requirePermission("devis.manage");
  const scope = getOwnerScope(user);
  const devis = await getDevisById(devisId);
  if (!devis) return { ok: false as const, error: "Devis introuvable." };
  if (!canManage(scope, devis.commercial)) return { ok: false as const, error: "Vous n'avez pas accès à ce devis." };
  return { ok: true as const, devis };
}

function revalidateDevis(devisId: string): void {
  revalidatePath("/dashboard/devis");
  revalidatePath(`/dashboard/devis/${devisId}`);
}

const lineItemSchema = z.object({
  catalogueItemId: z.string().trim().optional().nullable(),
  label: z.string().trim().min(1, "La désignation est requise.").optional(),
  category: z.enum([...CATALOGUE_CATEGORIES, "Autre"]).optional(),
  unit: z.enum(CATALOGUE_UNITS).optional(),
  quantity: z.coerce.number().min(0.01, "La quantité doit être positive."),
  unitPrice: z.coerce.number().min(0, "Le prix doit être positif."),
});

export async function addDevisLineItem(devisId: string, input: unknown): Promise<ActionResult> {
  const result = await requireManageableDevis(devisId);
  if (!result.ok) return result;

  const parsed = lineItemSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const catalogueItem = parsed.data.catalogueItemId ? getCatalogueItemById(parsed.data.catalogueItemId) : undefined;

  await getPgDb().insert(devisLineItemsTable).values({
    id: `DLI-${randomUUID().slice(0, 8).toUpperCase()}`,
    devisId,
    catalogueItemId: catalogueItem?.id ?? null,
    label: catalogueItem?.name ?? parsed.data.label ?? "Ligne personnalisée",
    category: catalogueItem?.category ?? parsed.data.category ?? "Autre",
    unit: catalogueItem?.unit ?? parsed.data.unit ?? "unité",
    quantity: parsed.data.quantity,
    unitPrice: catalogueItem ? catalogueItem.unitPrice : parsed.data.unitPrice,
  });

  await recomputeDevisAmount(devisId);
  revalidateDevis(devisId);
  return { ok: true, data: undefined };
}

const lineItemUpdateSchema = z.object({
  quantity: z.coerce.number().min(0.01, "La quantité doit être positive."),
  unitPrice: z.coerce.number().min(0, "Le prix doit être positif."),
});

export async function updateDevisLineItem(devisId: string, lineId: string, input: unknown): Promise<ActionResult> {
  const result = await requireManageableDevis(devisId);
  if (!result.ok) return result;

  const parsed = lineItemUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const db = getPgDb();
  const rows = await db.select().from(devisLineItemsTable).where(eq(devisLineItemsTable.id, lineId));
  const line = rows.find((l) => l.devisId === devisId);
  if (!line) {
    return { ok: false, error: "Ligne introuvable." };
  }

  await db
    .update(devisLineItemsTable)
    .set({ quantity: parsed.data.quantity, unitPrice: parsed.data.unitPrice })
    .where(eq(devisLineItemsTable.id, lineId));

  await recomputeDevisAmount(devisId);
  revalidateDevis(devisId);
  return { ok: true, data: undefined };
}

export async function removeDevisLineItem(devisId: string, lineId: string): Promise<ActionResult> {
  const result = await requireManageableDevis(devisId);
  if (!result.ok) return result;

  const db = getPgDb();
  const rows = await db.select().from(devisLineItemsTable).where(eq(devisLineItemsTable.id, lineId));
  const line = rows.find((l) => l.devisId === devisId);
  if (!line) {
    return { ok: false, error: "Ligne introuvable." };
  }
  await db.delete(devisLineItemsTable).where(eq(devisLineItemsTable.id, lineId));

  await recomputeDevisAmount(devisId);
  revalidateDevis(devisId);
  return { ok: true, data: undefined };
}

const pricingTermsSchema = z.object({
  discountType: z.enum(["Pourcentage", "Montant fixe", "none"]),
  discountValue: z.coerce.number().min(0, "La remise doit être positive."),
  taxRate: z.coerce.number().min(0).max(100, "Le taux de taxe doit être entre 0 et 100."),
  depositPercent: z.coerce.number().min(0).max(100, "L'acompte doit être entre 0 et 100."),
});

export async function updateDevisPricingTerms(devisId: string, input: unknown): Promise<ActionResult> {
  const result = await requireManageableDevis(devisId);
  if (!result.ok) return result;

  const parsed = pricingTermsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  await getPgDb()
    .update(devisTable)
    .set({
      discountType: parsed.data.discountType === "none" ? null : parsed.data.discountType,
      discountValue: parsed.data.discountType === "none" ? 0 : parsed.data.discountValue,
      taxRate: parsed.data.taxRate,
      depositPercent: parsed.data.depositPercent,
    })
    .where(eq(devisTable.id, devisId));

  await recomputeDevisAmount(devisId);
  revalidateDevis(devisId);
  return { ok: true, data: undefined };
}
