"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getPgDb } from "@/lib/db/pg";
import { kitchenRenders as kitchenRendersTable, kitchenRenderEvents as kitchenRenderEventsTable } from "@/lib/db/schema";
import { getKitchenRenderByShareToken } from "@/lib/data/kitchen-render";
import { getDevisById } from "@/lib/data/devis";
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
  const message = parsed.data.note?.trim() || "Design approuvé par le client.";

  await db.insert(kitchenRenderEventsTable).values({
    id: `KRE-${randomUUID().slice(0, 8).toUpperCase()}`,
    renderId: render.id,
    kind,
    message,
    authorName: devis?.clientName ?? "Client",
    createdAt: now,
  });

  const devisLink = devis ? `/dashboard/devis/${devis.id}` : undefined;
  if (parsed.data.decision === "approved") {
    notifyByName(devis?.commercial ?? null, {
      type: "design_approved",
      title: "Design de cuisine approuvé par le client",
      description: devis ? `${devis.ref} — ${devis.clientName}` : message,
      link: devisLink,
    });
  } else {
    const title = parsed.data.decision === "rejected" ? "Design de cuisine refusé par le client" : "Modification demandée par le client";
    const description = devis ? `${devis.ref} — ${message}` : message;
    notifyByName(devis?.commercial ?? null, { type: "design_revision_requested", title, description, link: devisLink });
    notifyAdmins({ type: "design_revision_requested", title, description, link: devisLink });
  }

  if (devis) revalidatePath(`/dashboard/devis/${devis.id}`);
  revalidatePath(`/apercu-cuisine/${token}`);
  return { ok: true, data: undefined };
}
