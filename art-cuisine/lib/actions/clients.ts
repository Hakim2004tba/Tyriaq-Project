"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { requirePermission } from "@/lib/auth/session";
import { getPgDb } from "@/lib/db/pg";
import { clients as clientsTable } from "@/lib/db/schema";
import { MESSAGES } from "@/lib/data/operations";
import { COMMERCIALS, CLIENT_STATUSES, getClientById } from "@/lib/data/clients";
import { getOwnerScope } from "@/lib/data/scope";
import { notifyAdmins } from "@/lib/notify";

type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const clientSchema = z.object({
  name: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères."),
  phone: z.string().trim().min(6, "Numéro de téléphone invalide."),
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide."),
  city: z.string().trim().min(2, "Ville requise."),
  address: z.string().trim().min(4, "Adresse requise."),
  commercial: z.enum(COMMERCIALS),
  status: z.enum(CLIENT_STATUSES),
});

export async function createClient(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requirePermission("clients.manage");
  const scope = getOwnerScope(user);

  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const db = getPgDb();
  const existing = await db.select().from(clientsTable).where(eq(clientsTable.email, parsed.data.email));
  if (existing.length > 0) {
    return { ok: false, error: "Un client existe déjà avec cette adresse e-mail." };
  }

  const id = `C-${randomUUID().slice(0, 8).toUpperCase()}`;
  await db.insert(clientsTable).values({
    id,
    name: parsed.data.name,
    phone: parsed.data.phone,
    email: parsed.data.email,
    city: parsed.data.city,
    address: parsed.data.address,
    // A commercial can only ever create clients assigned to themselves.
    commercial: scope ?? parsed.data.commercial,
    status: parsed.data.status,
    since: new Date().toISOString(),
  });

  notifyAdmins({ type: "new_client", title: "Nouveau client", description: parsed.data.name, link: `/dashboard/clients/${id}` });

  revalidatePath("/dashboard/clients");
  return { ok: true, data: { id } };
}

export async function updateClient(id: string, input: unknown): Promise<ActionResult> {
  const user = await requirePermission("clients.manage");
  const scope = getOwnerScope(user);

  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const client = await getClientById(id);
  if (!client) {
    return { ok: false, error: "Client introuvable." };
  }
  if (scope && client.commercial !== scope) {
    return { ok: false, error: "Vous n'avez pas accès à ce client." };
  }

  const db = getPgDb();
  const duplicate = await db.select().from(clientsTable).where(eq(clientsTable.email, parsed.data.email));
  if (duplicate.some((c) => c.id !== id)) {
    return { ok: false, error: "Un autre client utilise déjà cette adresse e-mail." };
  }

  await db
    .update(clientsTable)
    .set({
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email,
      city: parsed.data.city,
      address: parsed.data.address,
      // A commercial can never reassign a client away from themselves.
      commercial: scope ?? parsed.data.commercial,
      status: parsed.data.status,
    })
    .where(eq(clientsTable.id, id));

  revalidatePath("/dashboard/clients");
  revalidatePath(`/dashboard/clients/${id}`);
  return { ok: true, data: undefined };
}

const messageSchema = z.object({
  content: z.string().trim().min(1, "Le message ne peut pas être vide."),
});

export async function postClientMessage(clientId: string, input: unknown): Promise<ActionResult> {
  const user = await requirePermission("clients.manage");
  const client = await getClientById(clientId);
  if (!client) {
    return { ok: false, error: "Client introuvable." };
  }
  const scope = getOwnerScope(user);
  if (scope && client.commercial !== scope) {
    return { ok: false, error: "Vous n'avez pas accès à ce client." };
  }

  const parsed = messageSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Message invalide." };
  }

  MESSAGES.push({
    id: `MSG-${randomUUID().slice(0, 8)}`,
    clientName: client.name,
    sender: "team",
    authorName: user.name,
    content: parsed.data.content,
    timestamp: new Date().toISOString(),
  });

  revalidatePath(`/dashboard/clients/${clientId}`);
  return { ok: true, data: undefined };
}
