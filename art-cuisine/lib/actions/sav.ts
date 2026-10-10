"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission, requireClientRecord } from "@/lib/auth/session";
import { SAV_TICKETS, SAV_STATUSES, SAV_PRIORITIES, ACTIVITY } from "@/lib/data/operations";
import { getSavTicketById } from "@/lib/data/sav";
import { nextSavRef } from "@/lib/data/sav";
import { notifyAdmins, notifyByName } from "@/lib/notify";

type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

function revalidateSav(id?: string): void {
  revalidatePath("/dashboard/sav");
  if (id) revalidatePath(`/dashboard/sav/${id}`);
}

const createTicketSchema = z.object({
  projectRef: z.string().trim().min(1, "Sélectionnez un projet."),
  issue: z.string().trim().min(5, "Décrivez le problème (5 caractères minimum)."),
  priority: z.enum(SAV_PRIORITIES),
});

/** Client-initiated: files a new SAV request against one of their own projects. */
export async function createSavTicket(input: unknown): Promise<ActionResult<{ id: string }>> {
  const { client } = await requireClientRecord("sav.view_own");
  if (!client) return { ok: false, error: "Aucun compte client associé à cette adresse e-mail." };

  const parsed = createTicketSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const id = `SAV-${randomUUID().slice(0, 8).toUpperCase()}`;
  const ref = nextSavRef();
  const now = new Date().toISOString();

  SAV_TICKETS.unshift({
    id,
    ref,
    clientId: client.id,
    clientName: client.name,
    projectRef: parsed.data.projectRef,
    issue: parsed.data.issue,
    priority: parsed.data.priority,
    status: "Ouvert",
    assignedTo: "",
    createdAt: now,
  });

  ACTIVITY.unshift({
    id: `A-${randomUUID().slice(0, 6).toUpperCase()}`,
    category: "sav",
    message: `${ref} — ${parsed.data.issue}`,
    actor: client.name,
    timestamp: now,
    clientName: client.name,
  });

  notifyAdmins({
    type: "sav_created",
    title: "Nouvelle demande SAV",
    description: `${ref} — ${parsed.data.issue} (${client.name})`,
    link: "/dashboard/sav",
  });

  revalidateSav();
  return { ok: true, data: { id } };
}

const updateStatusSchema = z.object({
  status: z.enum(SAV_STATUSES),
  assignedTo: z.string().trim().optional().default(""),
});

export async function updateSavTicket(ticketId: string, input: unknown): Promise<ActionResult> {
  const user = await requirePermission("sav.manage");

  const ticket = getSavTicketById(ticketId);
  if (!ticket) return { ok: false, error: "Ticket introuvable." };

  const parsed = updateStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const previousAssignee = ticket.assignedTo;
  ticket.status = parsed.data.status;
  ticket.assignedTo = parsed.data.assignedTo;

  ACTIVITY.unshift({
    id: `A-${randomUUID().slice(0, 6).toUpperCase()}`,
    category: "sav",
    message: `${ticket.ref} — statut passé à « ${parsed.data.status} »`,
    actor: user.name,
    timestamp: new Date().toISOString(),
    clientName: ticket.clientName,
  });

  if (parsed.data.assignedTo && parsed.data.assignedTo !== previousAssignee) {
    notifyByName(parsed.data.assignedTo, {
      type: "task_assigned",
      title: "Intervention SAV assignée",
      description: `${ticket.ref} — ${ticket.issue}`,
      link: "/dashboard/sav",
    });
  }

  revalidateSav(ticketId);
  return { ok: true, data: undefined };
}
