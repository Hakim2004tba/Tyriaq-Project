"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { requirePermission } from "@/lib/auth/session";
import { getPgDb } from "@/lib/db/pg";
import { devis as devisTable } from "@/lib/db/schema";
import { ACTIVITY, type DevisRecord } from "@/lib/data/operations";
import { getDevisById, isDevisAwaitingClient } from "@/lib/data/devis";
import { getClientByEmail } from "@/lib/data/clients";
import type { ClientRecord } from "@/lib/data/operations";
import { notifyByName, notifyAdmins } from "@/lib/notify";

type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

type OwnDevisResult =
  | { ok: false; error: string }
  | { ok: true; devis: DevisRecord; client: ClientRecord; actorName: string };

/** Verifies the signed-in client-role user owns this devis, returning their Client record. */
async function requireOwnDevis(devisId: string): Promise<OwnDevisResult> {
  const user = await requirePermission("devis.view_own");
  const client = await getClientByEmail(user.email);
  if (!client) {
    return { ok: false, error: "Aucun compte client associé à cette adresse e-mail." };
  }

  const devis = await getDevisById(devisId);
  if (!devis) {
    return { ok: false, error: "Devis introuvable." };
  }
  if (devis.clientId !== client.id) {
    return { ok: false, error: "Ce devis ne vous appartient pas." };
  }
  if (!isDevisAwaitingClient(devis.status)) {
    return { ok: false, error: "Ce devis ne peut plus être modifié — il a déjà reçu une réponse." };
  }

  return { ok: true, devis, client, actorName: user.name };
}

function logDecision(clientName: string, actorName: string, message: string): void {
  ACTIVITY.unshift({
    id: `A-${randomUUID().slice(0, 6).toUpperCase()}`,
    category: "devis",
    message,
    actor: actorName,
    timestamp: new Date().toISOString(),
    clientName,
  });
}

function revalidateAfterDecision(devisId: string): void {
  revalidatePath("/dashboard/mes-devis");
  revalidatePath("/dashboard/devis");
  revalidatePath(`/dashboard/devis/${devisId}`);
}

export async function clientApproveDevis(devisId: string): Promise<ActionResult> {
  const result = await requireOwnDevis(devisId);
  if (!result.ok) return result;
  const { devis, actorName } = result;

  const decidedAt = new Date().toISOString();
  await getPgDb()
    .update(devisTable)
    .set({ status: "Accepté", clientNote: null, decidedAt })
    .where(eq(devisTable.id, devisId));

  logDecision(devis.clientName, actorName, `Devis ${devis.ref} approuvé par le client`);
  notifyByName(devis.commercial, { type: "devis_accepted", title: "Devis accepté", description: `${devis.ref} — ${devis.clientName}`, link: `/dashboard/devis/${devisId}` });
  notifyAdmins({ type: "devis_accepted", title: "Devis accepté", description: `${devis.ref} — ${devis.clientName}`, link: `/dashboard/devis/${devisId}` });
  revalidateAfterDecision(devisId);
  return { ok: true, data: undefined };
}

const noteSchema = z.object({ note: z.string().trim().min(5, "Merci de préciser votre demande (5 caractères minimum).") });

export async function clientRejectDevis(devisId: string, input: unknown): Promise<ActionResult> {
  const result = await requireOwnDevis(devisId);
  if (!result.ok) return result;
  const { devis, actorName } = result;

  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  await getPgDb()
    .update(devisTable)
    .set({ status: "Refusé", clientNote: parsed.data.note, decidedAt: new Date().toISOString() })
    .where(eq(devisTable.id, devisId));

  logDecision(devis.clientName, actorName, `Devis ${devis.ref} refusé par le client`);
  notifyByName(devis.commercial, { type: "devis_refused", title: "Devis refusé", description: `${devis.ref} — ${devis.clientName} : ${parsed.data.note}`, link: `/dashboard/devis/${devisId}` });
  notifyAdmins({ type: "devis_refused", title: "Devis refusé", description: `${devis.ref} — ${devis.clientName} : ${parsed.data.note}`, link: `/dashboard/devis/${devisId}` });
  revalidateAfterDecision(devisId);
  return { ok: true, data: undefined };
}

export async function clientRequestModification(devisId: string, input: unknown): Promise<ActionResult> {
  const result = await requireOwnDevis(devisId);
  if (!result.ok) return result;
  const { devis, actorName } = result;

  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  await getPgDb()
    .update(devisTable)
    .set({ status: "Modification demandée", clientNote: parsed.data.note, decidedAt: new Date().toISOString() })
    .where(eq(devisTable.id, devisId));

  logDecision(devis.clientName, actorName, `Modification demandée par le client sur le devis ${devis.ref}`);
  revalidateAfterDecision(devisId);
  return { ok: true, data: undefined };
}
