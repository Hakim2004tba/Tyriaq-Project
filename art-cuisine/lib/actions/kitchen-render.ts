"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { requirePermission } from "@/lib/auth/session";
import { getPgDb } from "@/lib/db/pg";
import {
  kitchenConfigs as kitchenConfigsTable,
  kitchenRenders as kitchenRendersTable,
  kitchenRenderRevisions as kitchenRenderRevisionsTable,
  kitchenRenderEvents as kitchenRenderEventsTable,
} from "@/lib/db/schema";
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
  type KitchenConfigRecord,
} from "@/lib/data/operations";
import { getDevisById } from "@/lib/data/devis";
import { getConfigByDevisId } from "@/lib/data/kitchen-config";
import { getKitchenRenderForDevis, getKitchenRenderRevisions } from "@/lib/data/kitchen-render";
import { getOwnerScope } from "@/lib/data/scope";
import { generateKitchenRenderImage, inlineImageToDataUrl, KitchenRenderError } from "@/lib/ai/kitchen-render";

type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

function canManage(scope: string | null, commercial: string | null): boolean {
  return !scope || commercial === null || commercial === scope;
}

async function requireManageableDevisWithConfig(devisId: string) {
  const user = await requirePermission("devis.manage");
  const scope = getOwnerScope(user);
  const devis = await getDevisById(devisId);
  if (!devis) return { ok: false as const, error: "Devis introuvable." };
  if (!canManage(scope, devis.commercial)) return { ok: false as const, error: "Vous n'avez pas accès à ce devis." };
  const config = await getConfigByDevisId(devisId);
  if (!config) return { ok: false as const, error: "Aucune configuration de cuisine pour ce devis." };
  return { ok: true as const, user, devis, config };
}

function revalidateDevisDetail(devisId: string): void {
  revalidatePath(`/dashboard/devis/${devisId}`);
}

function buildPrompt(config: KitchenConfigRecord, feedbackNote?: string, hasRegion?: boolean): string {
  const accessories = config.accessories.length > 0 ? config.accessories.join(", ") : "aucun";
  const base = `Tu es un visualiseur d'intérieur spécialisé en cuisines sur mesure. À partir de la photo de référence fournie (l'espace réel du client), génère une image photoréaliste montrant à quoi pourrait ressembler cette même pièce après rénovation par ART Cuisine, en conservant autant que possible la géométrie, les proportions et le point de vue de la pièce d'origine (murs, fenêtres, ouvertures).

Spécifications de la cuisine à représenter :
- Agencement : ${config.layout}${config.island === "Avec îlot" ? " avec îlot central" : ", sans îlot"}
- Profondeur des meubles : ${config.depth}
- Hotte : ${config.hood}
- Four : ${config.oven}
- Réfrigérateur : ${config.fridge}
- Accessoires souhaités : ${accessories}
- Type de sol : ${config.floor}
- Dimensions approximatives de l'espace : ${config.dimensions}
${config.additionalInfo ? `- Précisions du client : ${config.additionalInfo}` : ""}

Rends un résultat réaliste, bien éclairé, avec des matériaux et finitions haut de gamme cohérents avec une fabrication artisanale en atelier. N'ajoute aucun texte ni filigrane sur l'image.`;

  if (!feedbackNote) return base;

  if (hasRegion) {
    return `${base}

Une version précédente a déjà été générée (première image ci-jointe). Une deuxième image, identique mais avec une zone marquée en rouge semi-transparent, indique précisément où appliquer le changement suivant. Applique ce changement UNIQUEMENT dans la zone marquée, et conserve le reste de l'image strictement identique à la première image (mêmes meubles, mêmes couleurs, même cadrage en dehors de la zone marquée) : ${feedbackNote}`;
  }

  return `${base}

Une première version a déjà été générée (fournie en référence ci-joint). Applique cette retouche demandée par l'équipe, en conservant le reste de la composition : ${feedbackNote}`;
}

const correctedConfigSchema = z.object({
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
  additionalInfo: z.string().trim().optional().default(""),
});

/**
 * Staff correcting/confirming the client's submitted specs — step one of the
 * review gate, before approval unlocks AI generation. Deliberately leaves
 * photos, sketches and contact details untouched: those came from the
 * client as-submitted and aren't something staff should silently rewrite.
 */
export async function updateKitchenConfig(devisId: string, input: unknown): Promise<ActionResult> {
  const result = await requireManageableDevisWithConfig(devisId);
  if (!result.ok) return result;

  const parsed = correctedConfigSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  await getPgDb()
    .update(kitchenConfigsTable)
    .set(parsed.data)
    .where(eq(kitchenConfigsTable.devisId, devisId));

  revalidateDevisDetail(devisId);
  return { ok: true, data: undefined };
}

/**
 * Marks the reviewed specs as approved — the single gate that unlocks AI
 * generation. Nothing is generated here; this only records who signed off
 * and when, matching "do not generate before approval."
 */
export async function approveKitchenRender(devisId: string): Promise<ActionResult> {
  const result = await requireManageableDevisWithConfig(devisId);
  if (!result.ok) return result;
  const { user } = result;

  const db = getPgDb();
  const existing = await getKitchenRenderForDevis(devisId);
  const now = new Date().toISOString();

  if (existing) {
    await db
      .update(kitchenRendersTable)
      .set({ status: "approved", approvedBy: user.name, approvedAt: now, errorMessage: null, updatedAt: now })
      .where(eq(kitchenRendersTable.id, existing.id));
  } else {
    await db.insert(kitchenRendersTable).values({
      id: `KR-${randomUUID().slice(0, 8).toUpperCase()}`,
      devisId,
      status: "approved",
      approvedBy: user.name,
      approvedAt: now,
      currentRevisionId: null,
      errorMessage: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  revalidateDevisDetail(devisId);
  return { ok: true, data: undefined };
}

async function runGeneration({
  devisId,
  config,
  userName,
  feedbackNote,
  priorImage,
  regionOverlay,
}: {
  devisId: string;
  config: KitchenConfigRecord;
  userName: string;
  feedbackNote?: string;
  priorImage?: string;
  regionOverlay?: string;
}): Promise<ActionResult> {
  const db = getPgDb();
  const render = await getKitchenRenderForDevis(devisId);
  if (!render) return { ok: false, error: "Ce devis n'a pas encore été approuvé." };

  const now = new Date().toISOString();
  await db.update(kitchenRendersTable).set({ status: "generating", updatedAt: now }).where(eq(kitchenRendersTable.id, render.id));

  const prompt = buildPrompt(config, feedbackNote, Boolean(regionOverlay));
  // Original client photos only ground the very first generation — once there's a prior
  // image to edit, re-sending them alongside it just confuses which photo is "current."
  const referenceImages = priorImage ? [] : config.photos.map((p) => p.dataUrl).filter(Boolean);

  try {
    const image = await generateKitchenRenderImage({ prompt, referenceImages, priorImage, regionOverlay });
    const revisionId = `KRV-${randomUUID().slice(0, 8).toUpperCase()}`;

    await db.insert(kitchenRenderRevisionsTable).values({
      id: revisionId,
      renderId: render.id,
      imageDataUrl: inlineImageToDataUrl(image),
      prompt,
      feedbackNote: feedbackNote ?? null,
      createdBy: userName,
      createdAt: now,
    });

    await db
      .update(kitchenRendersTable)
      .set({ status: "generated", currentRevisionId: revisionId, errorMessage: null, updatedAt: new Date().toISOString() })
      .where(eq(kitchenRendersTable.id, render.id));

    revalidateDevisDetail(devisId);
    return { ok: true, data: undefined };
  } catch (error) {
    const message = error instanceof KitchenRenderError ? error.message : "La génération a échoué. Réessayez.";
    await db
      .update(kitchenRendersTable)
      .set({ status: "failed", errorMessage: message, updatedAt: new Date().toISOString() })
      .where(eq(kitchenRendersTable.id, render.id));
    revalidateDevisDetail(devisId);
    return { ok: false, error: message };
  }
}

/** First generation — requires the render to already be approved. */
export async function generateKitchenRender(devisId: string): Promise<ActionResult> {
  const result = await requireManageableDevisWithConfig(devisId);
  if (!result.ok) return result;
  const { user, config } = result;

  const render = await getKitchenRenderForDevis(devisId);
  if (!render || (render.status !== "approved" && render.status !== "failed")) {
    return { ok: false, error: "Ce devis doit être approuvé avant de générer une visualisation." };
  }

  return runGeneration({ devisId, config, userName: user.name });
}

const regenerateSchema = z.object({
  feedbackNote: z.string().trim().min(3, "Décrivez la retouche souhaitée."),
  /** The current image with a red brush mark over the area to change, exported client-side as a data URL. */
  regionOverlayDataUrl: z.string().trim().min(1).optional(),
});

/** Edits the current image in place (kept as a new revision, but becomes the new "current" one) rather than starting over. */
export async function regenerateKitchenRender(devisId: string, input: unknown): Promise<ActionResult> {
  const result = await requireManageableDevisWithConfig(devisId);
  if (!result.ok) return result;
  const { user, config } = result;

  const parsed = regenerateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const render = await getKitchenRenderForDevis(devisId);
  if (!render || render.status !== "generated" || !render.currentRevisionId) {
    return { ok: false, error: "Aucune visualisation à retoucher pour ce devis." };
  }

  const revisions = await getKitchenRenderRevisions(render.id);
  const currentRevision = revisions.find((r) => r.id === render.currentRevisionId);
  if (!currentRevision) return { ok: false, error: "Version actuelle introuvable." };

  return runGeneration({
    devisId,
    config,
    userName: user.name,
    feedbackNote: parsed.data.feedbackNote,
    priorImage: currentRevision.imageDataUrl,
    regionOverlay: parsed.data.regionOverlayDataUrl,
  });
}

/**
 * Points "current" at an existing revision — used for undo/redo (the
 * immediately previous/next revision chronologically) and for restoring any
 * older version from the history list. Nothing is deleted; every revision
 * this devis ever produced stays in kitchen_render_revisions regardless.
 */
export async function restoreKitchenRenderRevision(devisId: string, revisionId: string): Promise<ActionResult> {
  const result = await requireManageableDevisWithConfig(devisId);
  if (!result.ok) return result;

  const render = await getKitchenRenderForDevis(devisId);
  if (!render) return { ok: false, error: "Aucune visualisation pour ce devis." };

  const revisions = await getKitchenRenderRevisions(render.id);
  const target = revisions.find((r) => r.id === revisionId);
  if (!target) return { ok: false, error: "Version introuvable." };

  await getPgDb()
    .update(kitchenRendersTable)
    .set({ status: "generated", currentRevisionId: revisionId, errorMessage: null, updatedAt: new Date().toISOString() })
    .where(eq(kitchenRendersTable.id, render.id));

  revalidateDevisDetail(devisId);
  return { ok: true, data: undefined };
}

const noteSchema = z.object({ note: z.string().trim().min(1, "La note ne peut pas être vide.") });

/** A staff-only remark on this render — never shown on the customer-facing share page. */
export async function addKitchenRenderNote(devisId: string, input: unknown): Promise<ActionResult> {
  const result = await requireManageableDevisWithConfig(devisId);
  if (!result.ok) return result;
  const { user } = result;

  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Note invalide." };
  }

  const render = await getKitchenRenderForDevis(devisId);
  if (!render) return { ok: false, error: "Aucune visualisation pour ce devis." };

  await getPgDb().insert(kitchenRenderEventsTable).values({
    id: `KRE-${randomUUID().slice(0, 8).toUpperCase()}`,
    renderId: render.id,
    kind: "internal_note",
    message: parsed.data.note,
    authorName: user.name,
    createdAt: new Date().toISOString(),
  });

  revalidateDevisDetail(devisId);
  return { ok: true, data: undefined };
}

/**
 * Hands the customer a no-login link to the current image — the one gate
 * that makes a render visible to them at all (see app/apercu-cuisine/[token]).
 * Safe to call again later (e.g. after a retouch): the token is kept stable
 * so a link already sent to the client keeps working and just shows the
 * newer image.
 */
export async function shareKitchenRenderWithCustomer(devisId: string): Promise<ActionResult<{ shareToken: string }>> {
  const result = await requireManageableDevisWithConfig(devisId);
  if (!result.ok) return result;
  const { user } = result;

  const render = await getKitchenRenderForDevis(devisId);
  if (!render || render.status !== "generated") {
    return { ok: false, error: "Générez une visualisation avant de la partager." };
  }

  const db = getPgDb();
  const now = new Date().toISOString();
  const shareToken = render.shareToken ?? randomUUID().replace(/-/g, "");

  await db
    .update(kitchenRendersTable)
    .set({ sharedAt: now, shareToken, updatedAt: now })
    .where(eq(kitchenRendersTable.id, render.id));

  await db.insert(kitchenRenderEventsTable).values({
    id: `KRE-${randomUUID().slice(0, 8).toUpperCase()}`,
    renderId: render.id,
    kind: "shared",
    message: "Aperçu envoyé au client.",
    authorName: user.name,
    createdAt: now,
  });

  revalidateDevisDetail(devisId);
  return { ok: true, data: { shareToken } };
}
