"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getPgDb } from "@/lib/db/pg";
import { devis as devisTable, kitchenConfigs as kitchenConfigsTable } from "@/lib/db/schema";
import {
  KITCHEN_LAYOUTS,
  ISLAND_OPTIONS,
  DEPTH_OPTIONS,
  HOOD_OPTIONS,
  OVEN_OPTIONS,
  FRIDGE_OPTIONS,
  ACCESSORY_OPTIONS,
  FLOOR_TYPES,
  CONFIGURATOR_BUDGETS,
} from "@/lib/data/operations";
import { estimateAmountFromBudget } from "@/lib/data/kitchen-config";
import { nextRef } from "@/lib/data/devis";
import { notifyAdmins, notifyByRole } from "@/lib/notify";

type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const fileMetaSchema = z.object({
  name: z.string().trim().min(1),
  sizeLabel: z.string().trim().min(1),
});

const configSchema = z.object({
  layout: z.enum(KITCHEN_LAYOUTS),
  island: z.enum(ISLAND_OPTIONS),
  depth: z.enum(DEPTH_OPTIONS),
  hood: z.enum(HOOD_OPTIONS),
  oven: z.enum(OVEN_OPTIONS),
  fridge: z.enum(FRIDGE_OPTIONS),
  accessories: z.array(z.enum(ACCESSORY_OPTIONS)).default([]),
  budget: z.enum(CONFIGURATOR_BUDGETS),
  floor: z.enum(FLOOR_TYPES),
  dimensions: z.string().trim().min(1, "Les dimensions sont requises."),
  photos: z.array(fileMetaSchema).default([]),
  sketches: z.array(fileMetaSchema).default([]),
  additionalInfo: z.string().trim().optional().default(""),
  contactName: z.string().trim().min(2, "Votre nom est requis."),
  contactPhone: z.string().trim().min(6, "Numéro de téléphone invalide."),
  contactEmail: z.string().trim().toLowerCase().email("Adresse e-mail invalide."),
});

/**
 * Public-facing — called from the marketing site's kitchen configurator. No
 * auth required. Every submission creates both a Devis (unassigned, awaiting
 * a commercial to price and send it) and the linked KitchenConfigRecord that
 * carries every configurator selection, so nothing captured in the wizard is
 * lost once it reaches the internal team. The prospect has no Client, Lead
 * or Project yet — those links are added by staff once the request is
 * triaged (see linkDevisToClient/Lead/Project in lib/actions/devis.ts).
 */
export async function submitKitchenConfiguration(input: unknown): Promise<ActionResult<{ devisRef: string }>> {
  const parsed = configSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  const d = parsed.data;

  const devisId = `D-${randomUUID().slice(0, 8).toUpperCase()}`;
  const ref = await nextRef();
  const islandLabel = d.island === "Avec îlot" ? " avec îlot" : "";
  const projectLabel = `Cuisine ${d.layout}${islandLabel} — ${d.dimensions}`;

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 30);

  const db = getPgDb();
  await db.insert(devisTable).values({
    id: devisId,
    ref,
    clientName: d.contactName,
    projectLabel,
    amount: estimateAmountFromBudget(d.budget),
    status: "Brouillon",
    commercial: null,
    createdAt: new Date().toISOString(),
    validUntil: validUntil.toISOString(),
    clientId: null,
    leadId: null,
    projectRef: null,
    version: 1,
    familyId: devisId,
    clientNote: null,
    decidedAt: null,
    discountType: null,
    discountValue: 0,
    taxRate: 19,
    depositPercent: 30,
  });

  await db.insert(kitchenConfigsTable).values({
    id: `KC-${randomUUID().slice(0, 8).toUpperCase()}`,
    devisId,
    layout: d.layout,
    island: d.island,
    depth: d.depth,
    hood: d.hood,
    oven: d.oven,
    fridge: d.fridge,
    accessories: d.accessories,
    budget: d.budget,
    floor: d.floor,
    dimensions: d.dimensions,
    photos: d.photos,
    sketches: d.sketches,
    additionalInfo: d.additionalInfo ?? "",
    contactName: d.contactName,
    contactPhone: d.contactPhone,
    contactEmail: d.contactEmail,
    createdAt: new Date().toISOString(),
  });

  // Unassigned (commercial: null) — every commercial can already see it in
  // their list (filterDevis treats null as "unclaimed, visible to all"), but
  // without a notification nobody knows it arrived until they happen to
  // check. Admins and every commercial get pinged immediately, not just
  // whoever ends up claiming it.
  const description = `${projectLabel} — ${d.contactName} (${d.contactPhone})`;
  notifyAdmins({ type: "new_devis", title: "Nouvelle demande de devis", description, link: "/dashboard/devis" });
  notifyByRole("commercial", { type: "new_devis", title: "Nouvelle demande de devis", description, link: "/dashboard/devis" });

  revalidatePath("/dashboard/devis");
  return { ok: true, data: { devisRef: ref } };
}
