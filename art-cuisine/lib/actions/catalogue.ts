"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAnyPermission } from "@/lib/auth/session";
import {
  CATALOGUE_ITEMS,
  CATALOGUE_CATEGORIES,
  CATALOGUE_UNITS,
  CATALOGUE_AVAILABILITY_STATUSES,
  PRICE_HISTORY,
} from "@/lib/data/operations";
import { getCatalogueItemById } from "@/lib/data/pricing";

type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

/** Both the pricing-focused /dashboard/catalogue and the materials-focused /dashboard/materiaux manage this same data. */
async function requireCatalogueAccess() {
  return requireAnyPermission(["catalogue.manage", "materiaux.manage"]);
}

const catalogueItemSchema = z.object({
  name: z.string().trim().min(2, "Le nom est requis."),
  sku: z.string().trim().min(1, "La référence (SKU) est requise."),
  category: z.enum(CATALOGUE_CATEGORIES),
  unit: z.enum(CATALOGUE_UNITS),
  unitPrice: z.coerce.number().min(0, "Le prix doit être positif."),
  taxable: z.union([z.literal("on"), z.literal("true"), z.boolean()]).optional(),
  availability: z.enum(CATALOGUE_AVAILABILITY_STATUSES),
  active: z.union([z.literal("on"), z.literal("true"), z.boolean()]).optional(),
  description: z.string().trim().optional().default(""),
});

function toBool(value: unknown): boolean {
  return value === "on" || value === "true" || value === true;
}

export async function createCatalogueItem(input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireCatalogueAccess();

  const parsed = catalogueItemSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const id = `CAT-${randomUUID().slice(0, 8).toUpperCase()}`;
  CATALOGUE_ITEMS.unshift({
    id,
    sku: parsed.data.sku,
    name: parsed.data.name,
    category: parsed.data.category,
    unit: parsed.data.unit,
    unitPrice: parsed.data.unitPrice,
    taxable: toBool(parsed.data.taxable),
    availability: parsed.data.availability,
    active: parsed.data.active === undefined ? true : toBool(parsed.data.active),
    description: parsed.data.description ?? "",
    updatedAt: new Date().toISOString(),
  });

  revalidatePath("/dashboard/catalogue");
  revalidatePath("/dashboard/materiaux");
  return { ok: true, data: { id } };
}

export async function updateCatalogueItem(id: string, input: unknown): Promise<ActionResult> {
  const user = await requireCatalogueAccess();

  const parsed = catalogueItemSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const item = getCatalogueItemById(id);
  if (!item) {
    return { ok: false, error: "Article introuvable." };
  }

  if (parsed.data.unitPrice !== item.unitPrice) {
    PRICE_HISTORY.unshift({
      id: `PH-${randomUUID().slice(0, 8).toUpperCase()}`,
      itemId: item.id,
      previousPrice: item.unitPrice,
      newPrice: parsed.data.unitPrice,
      changedBy: user.name,
      changedAt: new Date().toISOString(),
      note: null,
    });
  }

  item.sku = parsed.data.sku;
  item.name = parsed.data.name;
  item.category = parsed.data.category;
  item.unit = parsed.data.unit;
  item.unitPrice = parsed.data.unitPrice;
  item.taxable = toBool(parsed.data.taxable);
  item.availability = parsed.data.availability;
  item.active = parsed.data.active === undefined ? item.active : toBool(parsed.data.active);
  item.description = parsed.data.description ?? "";
  item.updatedAt = new Date().toISOString();

  revalidatePath("/dashboard/catalogue");
  revalidatePath("/dashboard/materiaux");
  return { ok: true, data: undefined };
}

export async function toggleCatalogueItemActive(id: string): Promise<ActionResult> {
  await requireCatalogueAccess();

  const item = getCatalogueItemById(id);
  if (!item) {
    return { ok: false, error: "Article introuvable." };
  }

  item.active = !item.active;
  revalidatePath("/dashboard/catalogue");
  revalidatePath("/dashboard/materiaux");
  return { ok: true, data: undefined };
}
