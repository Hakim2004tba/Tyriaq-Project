"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { requirePermission } from "@/lib/auth/session";
import { getPgDb } from "@/lib/db/pg";
import { devis as devisTable, devisVersions as devisVersionsTable, devisLineItems as devisLineItemsTable, kitchenConfigs as kitchenConfigsTable } from "@/lib/db/schema";
import {
  DEVIS_STATUSES,
  PROJECTS,
  ACTIVITY,
  MESSAGES,
  type DevisRecord,
} from "@/lib/data/operations";
import { COMMERCIALS, getDevisById, nextRef } from "@/lib/data/devis";
import { getClientById } from "@/lib/data/clients";
import { getLineItemsForDevis, recomputeDevisAmount } from "@/lib/data/pricing";
import { getConfigByDevisId } from "@/lib/data/kitchen-config";
import { getOwnerScope } from "@/lib/data/scope";
import { notifyEmail, notifyByName, notifyAdmins } from "@/lib/notify";

type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

function canManage(scope: string | null, commercial: string | null): boolean {
  return !scope || commercial === null || commercial === scope;
}

function normalizeLink(value: string | null | undefined): string | null {
  return value && value !== "none" ? value : null;
}

const devisSchema = z.object({
  clientId: z.string().trim().min(1, "Le client est requis."),
  leadId: z.string().trim().optional().nullable(),
  projectRef: z.string().trim().optional().nullable(),
  projectLabel: z.string().trim().min(2, "La description du projet est requise."),
  amount: z.coerce.number().min(1, "Le montant doit être positif."),
  validUntil: z.string().trim().min(1, "La date de validité est requise."),
  commercial: z.enum(COMMERCIALS),
});

export async function createDevis(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requirePermission("devis.manage");
  const scope = getOwnerScope(user);

  const parsed = devisSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const client = await getClientById(parsed.data.clientId);
  if (!client) {
    return { ok: false, error: "Client introuvable." };
  }

  const id = `D-${randomUUID().slice(0, 8).toUpperCase()}`;
  await getPgDb().insert(devisTable).values({
    id,
    ref: await nextRef(),
    clientName: client.name,
    projectLabel: parsed.data.projectLabel,
    amount: parsed.data.amount,
    status: "Brouillon",
    // A commercial can only ever create devis assigned to themselves.
    commercial: scope ?? parsed.data.commercial,
    createdAt: new Date().toISOString(),
    validUntil: new Date(parsed.data.validUntil).toISOString(),
    clientId: client.id,
    leadId: normalizeLink(parsed.data.leadId),
    projectRef: normalizeLink(parsed.data.projectRef),
    version: 1,
    familyId: id,
    clientNote: null,
    decidedAt: null,
    discountType: null,
    discountValue: 0,
    taxRate: 19,
    depositPercent: 30,
  });

  revalidatePath("/dashboard/devis");
  return { ok: true, data: { id } };
}

export async function updateDevis(id: string, input: unknown): Promise<ActionResult> {
  const user = await requirePermission("devis.manage");
  const scope = getOwnerScope(user);

  const parsed = devisSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const devis = await getDevisById(id);
  if (!devis) {
    return { ok: false, error: "Devis introuvable." };
  }
  if (!canManage(scope, devis.commercial)) {
    return { ok: false, error: "Vous n'avez pas accès à ce devis." };
  }

  const client = await getClientById(parsed.data.clientId);
  if (!client) {
    return { ok: false, error: "Client introuvable." };
  }

  await getPgDb()
    .update(devisTable)
    .set({
      clientId: client.id,
      clientName: client.name,
      leadId: normalizeLink(parsed.data.leadId),
      projectRef: normalizeLink(parsed.data.projectRef),
      projectLabel: parsed.data.projectLabel,
      amount: parsed.data.amount,
      validUntil: new Date(parsed.data.validUntil).toISOString(),
      commercial: scope ?? parsed.data.commercial,
    })
    .where(eq(devisTable.id, id));

  revalidatePath("/dashboard/devis");
  revalidatePath(`/dashboard/devis/${id}`);
  return { ok: true, data: undefined };
}

const statusSchema = z.object({ status: z.enum(DEVIS_STATUSES) });

export async function updateDevisStatus(id: string, status: unknown): Promise<ActionResult> {
  const user = await requirePermission("devis.manage");
  const scope = getOwnerScope(user);

  const parsed = statusSchema.safeParse({ status });
  if (!parsed.success) {
    return { ok: false, error: "Statut invalide." };
  }

  const devis = await getDevisById(id);
  if (!devis) {
    return { ok: false, error: "Devis introuvable." };
  }
  if (!canManage(scope, devis.commercial)) {
    return { ok: false, error: "Vous n'avez pas accès à ce devis." };
  }

  // Acting on an unclaimed public request assigns it to whoever does.
  const newCommercial = scope && devis.commercial === null ? scope : devis.commercial;
  await getPgDb()
    .update(devisTable)
    .set({ status: parsed.data.status, commercial: newCommercial })
    .where(eq(devisTable.id, id));
  devis.status = parsed.data.status;
  devis.commercial = newCommercial;

  if (parsed.data.status === "Envoyé" && devis.clientId) {
    const client = await getClientById(devis.clientId);
    if (client) {
      notifyEmail(client.email, {
        type: "new_devis",
        title: "Nouveau devis disponible",
        description: `Le devis ${devis.ref} est prêt pour votre validation.`,
        link: "/dashboard/mes-devis",
      });
    }
  }
  if (parsed.data.status === "Accepté" || parsed.data.status === "Refusé") {
    const type = parsed.data.status === "Accepté" ? "devis_accepted" : "devis_refused";
    const title = parsed.data.status === "Accepté" ? "Devis accepté" : "Devis refusé";
    notifyByName(devis.commercial, { type, title, description: `${devis.ref} — ${devis.clientName}`, link: `/dashboard/devis/${id}` });
    notifyAdmins({ type, title, description: `${devis.ref} — ${devis.clientName}`, link: `/dashboard/devis/${id}` });
  }

  revalidatePath("/dashboard/devis");
  revalidatePath(`/dashboard/devis/${id}`);
  return { ok: true, data: undefined };
}

const linkProjectSchema = z.object({ projectRef: z.string().trim().nullable() });

/** Links (or unlinks) a devis to a production project — the connection production staff and the client both rely on. */
export async function linkDevisToProject(id: string, input: unknown): Promise<ActionResult> {
  const user = await requirePermission("devis.manage");
  const scope = getOwnerScope(user);

  const devis = await getDevisById(id);
  if (!devis) {
    return { ok: false, error: "Devis introuvable." };
  }
  if (!canManage(scope, devis.commercial)) {
    return { ok: false, error: "Vous n'avez pas accès à ce devis." };
  }

  const parsed = linkProjectSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Projet invalide." };
  }
  if (parsed.data.projectRef && !PROJECTS.some((p) => p.ref === parsed.data.projectRef)) {
    return { ok: false, error: "Projet introuvable." };
  }

  const newCommercial = scope && devis.commercial === null ? scope : devis.commercial;
  await getPgDb()
    .update(devisTable)
    .set({ projectRef: parsed.data.projectRef, commercial: newCommercial })
    .where(eq(devisTable.id, id));

  revalidatePath("/dashboard/devis");
  revalidatePath(`/dashboard/devis/${id}`);
  return { ok: true, data: undefined };
}

/** Clones a devis (and its kitchen configuration, if any) into a fresh draft — a new, independent quote. */
export async function duplicateDevis(id: string): Promise<ActionResult<{ id: string }>> {
  const user = await requirePermission("devis.manage");
  const scope = getOwnerScope(user);

  const original = await getDevisById(id);
  if (!original) {
    return { ok: false, error: "Devis introuvable." };
  }
  if (!canManage(scope, original.commercial)) {
    return { ok: false, error: "Vous n'avez pas accès à ce devis." };
  }

  const newId = `D-${randomUUID().slice(0, 8).toUpperCase()}`;
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 30);

  const copy: DevisRecord = {
    id: newId,
    ref: await nextRef(),
    clientName: original.clientName,
    projectLabel: `${original.projectLabel} (copie)`,
    amount: original.amount,
    status: "Brouillon",
    commercial: scope ?? original.commercial,
    createdAt: new Date().toISOString(),
    validUntil: validUntil.toISOString(),
    clientId: original.clientId,
    leadId: original.leadId,
    projectRef: original.projectRef,
    version: 1,
    familyId: newId,
    clientNote: null,
    decidedAt: null,
    discountType: original.discountType,
    discountValue: original.discountValue,
    taxRate: original.taxRate,
    depositPercent: original.depositPercent,
  };
  const db = getPgDb();
  await db.insert(devisTable).values(copy);

  const originalLines = await getLineItemsForDevis(original.id);
  for (const line of originalLines) {
    await db.insert(devisLineItemsTable).values({
      ...line,
      id: `DLI-${randomUUID().slice(0, 8).toUpperCase()}`,
      devisId: newId,
    });
  }
  await recomputeDevisAmount(newId);

  const originalConfig = await getConfigByDevisId(original.id);
  if (originalConfig) {
    await db.insert(kitchenConfigsTable).values({
      ...originalConfig,
      id: `KC-${randomUUID().slice(0, 8).toUpperCase()}`,
      devisId: newId,
      createdAt: new Date().toISOString(),
    });
  }

  revalidatePath("/dashboard/devis");
  return { ok: true, data: { id: newId } };
}

const newVersionSchema = z.object({
  amount: z.coerce.number().min(1, "Le montant doit être positif."),
  projectLabel: z.string().trim().min(2, "La description du projet est requise."),
  validUntil: z.string().trim().min(1, "La date de validité est requise."),
  note: z.string().trim().min(2, "Merci de préciser ce qui a changé."),
});

/**
 * Issues a new, revised version of a quote — typically after the client
 * requested changes. The current state is snapshotted into DEVIS_VERSIONS
 * before being overwritten, so the full history stays inspectable.
 */
export async function createDevisVersion(id: string, input: unknown): Promise<ActionResult> {
  const user = await requirePermission("devis.manage");
  const scope = getOwnerScope(user);

  const devis = await getDevisById(id);
  if (!devis) {
    return { ok: false, error: "Devis introuvable." };
  }
  if (!canManage(scope, devis.commercial)) {
    return { ok: false, error: "Vous n'avez pas accès à ce devis." };
  }

  const parsed = newVersionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const db = getPgDb();
  await db.insert(devisVersionsTable).values({
    id: `DV-${randomUUID().slice(0, 8).toUpperCase()}`,
    devisId: devis.id,
    version: devis.version,
    amount: devis.amount,
    projectLabel: devis.projectLabel,
    status: devis.status,
    note: parsed.data.note,
    createdAt: new Date().toISOString(),
    createdBy: scope ?? devis.commercial ?? user.name,
  });

  const newCommercial = scope && devis.commercial === null ? scope : devis.commercial;
  await db
    .update(devisTable)
    .set({
      amount: parsed.data.amount,
      projectLabel: parsed.data.projectLabel,
      validUntil: new Date(parsed.data.validUntil).toISOString(),
      version: devis.version + 1,
      status: "Envoyé",
      clientNote: null,
      decidedAt: null,
      commercial: newCommercial,
    })
    .where(eq(devisTable.id, id));
  // If this quote is priced via the catalogue, the line items stay authoritative over the typed amount.
  await recomputeDevisAmount(id);

  revalidatePath("/dashboard/devis");
  revalidatePath(`/dashboard/devis/${id}`);
  return { ok: true, data: undefined };
}

/** Simulated send — no real mail provider is wired up, so this logs the send as activity/message history. */
export async function sendDevisByEmail(id: string): Promise<ActionResult<{ email: string }>> {
  const user = await requirePermission("devis.manage");
  const scope = getOwnerScope(user);

  const devis = await getDevisById(id);
  if (!devis) {
    return { ok: false, error: "Devis introuvable." };
  }
  if (!canManage(scope, devis.commercial)) {
    return { ok: false, error: "Vous n'avez pas accès à ce devis." };
  }

  const client = devis.clientId ? await getClientById(devis.clientId) : undefined;
  const config = await getConfigByDevisId(devis.id);
  const email = client?.email ?? config?.contactEmail ?? null;
  if (!email) {
    return { ok: false, error: "Aucune adresse e-mail disponible pour ce devis." };
  }

  const newCommercial = scope && devis.commercial === null ? scope : devis.commercial;
  await getPgDb()
    .update(devisTable)
    .set({
      status: devis.status === "Brouillon" ? "Envoyé" : devis.status,
      commercial: newCommercial,
    })
    .where(eq(devisTable.id, id));

  ACTIVITY.unshift({
    id: `A-${randomUUID().slice(0, 6).toUpperCase()}`,
    category: "devis",
    message: `Devis ${devis.ref} envoyé par e-mail à ${email}`,
    actor: scope ?? devis.commercial ?? user.name,
    timestamp: new Date().toISOString(),
    clientName: devis.clientName,
  });

  MESSAGES.unshift({
    id: `MSG-${randomUUID().slice(0, 6).toUpperCase()}`,
    clientName: devis.clientName,
    sender: "team",
    authorName: scope ?? devis.commercial ?? user.name,
    content: `Votre devis ${devis.ref} (${devis.projectLabel}) vient de vous être envoyé par e-mail.`,
    timestamp: new Date().toISOString(),
  });

  revalidatePath("/dashboard/devis");
  revalidatePath(`/dashboard/devis/${id}`);
  return { ok: true, data: { email } };
}
