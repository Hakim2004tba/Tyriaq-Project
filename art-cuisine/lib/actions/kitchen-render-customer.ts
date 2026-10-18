"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getPgDb } from "@/lib/db/pg";
import { devis as devisTable, kitchenRenders as kitchenRendersTable, kitchenRenderEvents as kitchenRenderEventsTable } from "@/lib/db/schema";
import { getKitchenRenderByShareToken } from "@/lib/data/kitchen-render";
import { getDevisById } from "@/lib/data/devis";
import { ACTIVITY } from "@/lib/data/operations";
import { notifyByName, notifyAdmins } from "@/lib/notify";

type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const decisionSchema = z.object({
  decision: z.enum(["approved", "rejected", "changes_requested"]),
  note: z.string().trim().optional(),
});

/**
 * The only write path a customer ever touches for this feature — gated
 * purely by knowing the share token (no login), same trust model as the
 * existing document-share links. Only reachable once staff has shared the
 * render (sharedAt set); see app/apercu-cuisine/[token].
 *
 * The page presents the AI render alongside the quoted price as one offer,
 * not a separate "design approval" step — so the customer's decision here
 * IS their decision on the devis itself: approving drives the devis straight
 * to "Accepté" (same transition the authenticated client portal's
 * clientApproveDevis makes — see lib/actions/client-devis.ts), rejecting or
 * requesting changes moves it accordingly. Nothing here ever creates a
 * project; that stays the separate, manual "Convertir en projet" step once
 * a commercial has the accepted devis in front of them.
 */
export async function submitCustomerRenderDecision(token: string, input: unknown): Promise<ActionResult> {
  const parsed = decisionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Réponse invalide." };
  if (parsed.data.decision !== "approved" && !parsed.data.note?.trim()) {
    return { ok: false, error: "Merci de préciser votre demande." };
  }

  const render = await getKitchenRenderByShareToken(token);
  if (!render || !render.sharedAt) return { ok: false, error: "Aperçu introuvable." };

  const devis = await getDevisById(render.devisId);
  const now = new Date().toISOString();
  const db = getPgDb();

  await db
    .update(kitchenRendersTable)
    .set({ customerDecision: parsed.data.decision, customerDecisionAt: now, updatedAt: now })
    .where(eq(kitchenRendersTable.id, render.id));

  const kind =
    parsed.data.decision === "approved" ? "customer_approved" : parsed.data.decision === "rejected" ? "customer_rejected" : "customer_feedback";
  const message = parsed.data.note?.trim() || "Offre approuvée par le client.";

  await db.insert(kitchenRenderEventsTable).values({
    id: `KRE-${randomUUID().slice(0, 8).toUpperCase()}`,
    renderId: render.id,
    kind,
    message,
    authorName: devis?.clientName ?? "Client",
    createdAt: now,
  });

  if (devis) {
    const devisStatus =
      parsed.data.decision === "approved" ? "Accepté" : parsed.data.decision === "rejected" ? "Refusé" : "Modification demandée";

    await db
      .update(devisTable)
      .set({ status: devisStatus, clientNote: parsed.data.decision === "approved" ? null : parsed.data.note, decidedAt: now })
      .where(eq(devisTable.id, devis.id));

    ACTIVITY.unshift({
      id: `A-${randomUUID().slice(0, 6).toUpperCase()}`,
      category: "devis",
      message: `Devis ${devis.ref} ${devisStatus.toLowerCase()} par le client`,
      actor: devis.clientName,
      timestamp: now,
      clientName: devis.clientName,
    });
  }

  const devisLink = devis ? `/dashboard/devis/${devis.id}` : undefined;
  if (parsed.data.decision === "approved") {
    notifyByName(devis?.commercial ?? null, {
      type: "devis_accepted",
      title: "Devis accepté par le client",
      description: devis ? `${devis.ref} — ${devis.clientName}` : message,
      link: devisLink,
    });
    notifyAdmins({
      type: "devis_accepted",
      title: "Devis accepté par le client",
      description: devis ? `${devis.ref} — ${devis.clientName}` : message,
      link: devisLink,
    });
  } else if (parsed.data.decision === "rejected") {
    const description = devis ? `${devis.ref} — ${message}` : message;
    notifyByName(devis?.commercial ?? null, { type: "devis_refused", title: "Devis refusé par le client", description, link: devisLink });
    notifyAdmins({ type: "devis_refused", title: "Devis refusé par le client", description, link: devisLink });
  } else {
    const description = devis ? `${devis.ref} — ${message}` : message;
    notifyByName(devis?.commercial ?? null, { type: "design_revision_requested", title: "Modification demandée par le client", description, link: devisLink });
    notifyAdmins({ type: "design_revision_requested", title: "Modification demandée par le client", description, link: devisLink });
  }

  if (devis) {
    revalidatePath(`/dashboard/devis/${devis.id}`);
    revalidatePath(`/suivi/${devis.ref}`);
  }
  revalidatePath(`/apercu-cuisine/${token}`);
  return { ok: true, data: undefined };
}
