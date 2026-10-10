"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { requirePermission } from "@/lib/auth/session";
import { getPgDb } from "@/lib/db/pg";
import { leads as leadsTable, leadInteractions as leadInteractionsTable, clients as clientsTable } from "@/lib/db/schema";
import { LEAD_STATUSES, LEAD_SOURCES, PROJECT_TYPES } from "@/lib/data/operations";
import { COMMERCIALS, getLeadById } from "@/lib/data/leads";
import { getOwnerScope } from "@/lib/data/scope";
import { notifyAdmins, notifyByName } from "@/lib/notify";

type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const leadSchema = z.object({
  name: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères."),
  phone: z.string().trim().min(6, "Numéro de téléphone invalide."),
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide."),
  city: z.string().trim().min(2, "Ville requise."),
  source: z.enum(LEAD_SOURCES),
  projectType: z.enum(PROJECT_TYPES),
  budget: z.coerce.number().min(0, "Le budget doit être positif."),
  commercial: z.enum(COMMERCIALS),
});

export async function createLead(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requirePermission("leads.manage");
  const scope = getOwnerScope(user);

  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const id = `L-${randomUUID().slice(0, 8).toUpperCase()}`;
  const commercial = scope ?? parsed.data.commercial;
  await getPgDb().insert(leadsTable).values({
    id,
    name: parsed.data.name,
    phone: parsed.data.phone,
    email: parsed.data.email,
    city: parsed.data.city,
    source: parsed.data.source,
    status: "Nouveau",
    // A commercial can only ever create leads assigned to themselves.
    commercial,
    projectType: parsed.data.projectType,
    budget: parsed.data.budget,
    nextFollowUpAt: null,
    createdAt: new Date().toISOString(),
  });

  notifyAdmins({ type: "new_lead", title: "Nouveau lead", description: `${parsed.data.name} — ${parsed.data.city}`, link: "/dashboard/leads" });
  notifyByName(commercial, { type: "new_lead", title: "Nouveau lead assigné", description: `${parsed.data.name} — ${parsed.data.city}`, link: "/dashboard/leads" });

  revalidatePath("/dashboard/leads");
  return { ok: true, data: { id } };
}

export async function updateLead(id: string, input: unknown): Promise<ActionResult> {
  const user = await requirePermission("leads.manage");
  const scope = getOwnerScope(user);

  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const lead = await getLeadById(id);
  if (!lead) {
    return { ok: false, error: "Lead introuvable." };
  }
  if (scope && lead.commercial !== scope) {
    return { ok: false, error: "Vous n'avez pas accès à ce lead." };
  }

  await getPgDb()
    .update(leadsTable)
    .set({
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email,
      city: parsed.data.city,
      source: parsed.data.source,
      projectType: parsed.data.projectType,
      budget: parsed.data.budget,
      // A commercial can never reassign a lead away from themselves.
      commercial: scope ?? parsed.data.commercial,
    })
    .where(eq(leadsTable.id, id));

  revalidatePath("/dashboard/leads");
  revalidatePath(`/dashboard/leads/${id}`);
  return { ok: true, data: undefined };
}

const statusSchema = z.object({ status: z.enum(LEAD_STATUSES) });

export async function updateLeadStatus(id: string, status: unknown): Promise<ActionResult> {
  const user = await requirePermission("leads.manage");
  const scope = getOwnerScope(user);

  const parsed = statusSchema.safeParse({ status });
  if (!parsed.success) {
    return { ok: false, error: "Statut invalide." };
  }

  const lead = await getLeadById(id);
  if (!lead) {
    return { ok: false, error: "Lead introuvable." };
  }
  if (scope && lead.commercial !== scope) {
    return { ok: false, error: "Vous n'avez pas accès à ce lead." };
  }

  const closing = parsed.data.status === "Gagné" || parsed.data.status === "Perdu";
  await getPgDb()
    .update(leadsTable)
    .set({ status: parsed.data.status, ...(closing ? { nextFollowUpAt: null } : {}) })
    .where(eq(leadsTable.id, id));

  revalidatePath("/dashboard/leads");
  revalidatePath(`/dashboard/leads/${id}`);
  return { ok: true, data: undefined };
}

const interactionSchema = z.object({
  type: z.enum(["note", "call", "appointment", "task", "reminder"]),
  title: z.string().trim().min(2, "Le titre est requis."),
  content: z.string().trim().optional().default(""),
  dueDate: z.string().trim().optional().nullable(),
  outcome: z.string().trim().optional().nullable(),
});

export async function addLeadInteraction(leadId: string, input: unknown): Promise<ActionResult> {
  const user = await requirePermission("leads.manage");
  const lead = await getLeadById(leadId);
  if (!lead) {
    return { ok: false, error: "Lead introuvable." };
  }
  const scope = getOwnerScope(user);
  if (scope && lead.commercial !== scope) {
    return { ok: false, error: "Vous n'avez pas accès à ce lead." };
  }

  const parsed = interactionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate).toISOString() : null;

  const db = getPgDb();
  await db.insert(leadInteractionsTable).values({
    id: `LI-${randomUUID().slice(0, 8)}`,
    leadId,
    type: parsed.data.type,
    title: parsed.data.title,
    content: parsed.data.content ?? "",
    dueDate,
    completed: false,
    outcome: parsed.data.outcome || null,
    createdBy: user.name,
    createdAt: new Date().toISOString(),
  });

  if (dueDate && (parsed.data.type === "task" || parsed.data.type === "reminder" || parsed.data.type === "appointment")) {
    await db.update(leadsTable).set({ nextFollowUpAt: dueDate }).where(eq(leadsTable.id, leadId));
  }

  revalidatePath(`/dashboard/leads/${leadId}`);
  return { ok: true, data: undefined };
}

export async function toggleInteractionDone(interactionId: string): Promise<ActionResult> {
  const user = await requirePermission("leads.manage");
  const scope = getOwnerScope(user);

  const db = getPgDb();
  const rows = await db.select().from(leadInteractionsTable).where(eq(leadInteractionsTable.id, interactionId));
  const interaction = rows[0];
  if (!interaction) {
    return { ok: false, error: "Élément introuvable." };
  }
  if (scope) {
    const lead = await getLeadById(interaction.leadId);
    if (!lead || lead.commercial !== scope) {
      return { ok: false, error: "Vous n'avez pas accès à ce lead." };
    }
  }

  await db
    .update(leadInteractionsTable)
    .set({ completed: !interaction.completed })
    .where(eq(leadInteractionsTable.id, interactionId));
  revalidatePath(`/dashboard/leads/${interaction.leadId}`);
  return { ok: true, data: undefined };
}

export async function convertLeadToClient(leadId: string): Promise<ActionResult<{ clientId: string }>> {
  const user = await requirePermission("clients.manage");
  const scope = getOwnerScope(user);

  const lead = await getLeadById(leadId);
  if (!lead) {
    return { ok: false, error: "Lead introuvable." };
  }
  if (scope && lead.commercial !== scope) {
    return { ok: false, error: "Vous n'avez pas accès à ce lead." };
  }

  const db = getPgDb();
  const existingRows = await db.select().from(clientsTable).where(eq(clientsTable.email, lead.email));
  const existing = existingRows[0];
  let clientId: string;

  if (existing) {
    clientId = existing.id;
  } else {
    clientId = `C-${randomUUID().slice(0, 8).toUpperCase()}`;
    await db.insert(clientsTable).values({
      id: clientId,
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      city: lead.city,
      address: `Adresse à compléter, ${lead.city}`,
      commercial: lead.commercial,
      status: "Actif",
      since: new Date().toISOString(),
    });
  }

  await db.update(leadsTable).set({ status: "Gagné", nextFollowUpAt: null }).where(eq(leadsTable.id, leadId));

  await db.insert(leadInteractionsTable).values({
    id: `LI-${randomUUID().slice(0, 8)}`,
    leadId,
    type: "note",
    title: "Converti en client",
    content: existing
      ? "Lead rattaché à une fiche client existante."
      : "Lead converti en nouvelle fiche client.",
    dueDate: null,
    completed: true,
    outcome: null,
    createdBy: "Système",
    createdAt: new Date().toISOString(),
  });

  revalidatePath("/dashboard/leads");
  revalidatePath("/dashboard/clients");
  return { ok: true, data: { clientId } };
}
