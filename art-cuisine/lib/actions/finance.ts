"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/session";
import {
  PAYMENTS,
  PAYMENT_METHODS,
  ACTIVITY,
  type PaymentRecord,
  type PaymentStatus,
} from "@/lib/data/operations";
import { getProjectById } from "@/lib/data/project-records";
import { getDevisById } from "@/lib/data/devis";
import { getPaymentById, nextPaymentId } from "@/lib/data/finance";
import { getOwnerScope } from "@/lib/data/scope";
import { getClientById } from "@/lib/data/clients";
import { notifyEmail, notifyAdmins } from "@/lib/notify";

async function notifyPaymentStatus(payment: PaymentRecord): Promise<void> {
  if (payment.status === "Payé") {
    notifyAdmins({ type: "payment_received", title: "Paiement reçu", description: `${payment.label} — ${payment.clientName}`, link: "/dashboard/finance" });
    if (payment.clientId) {
      const client = await getClientById(payment.clientId);
      if (client) notifyEmail(client.email, { type: "payment_received", title: "Paiement reçu", description: payment.label, link: "/dashboard/mes-paiements" });
    }
  } else if (payment.status === "En retard") {
    notifyAdmins({ type: "payment_overdue", title: "Paiement en retard", description: `${payment.label} — ${payment.clientName}`, link: "/dashboard/finance" });
    if (payment.clientId) {
      const client = await getClientById(payment.clientId);
      if (client) notifyEmail(client.email, { type: "payment_overdue", title: "Paiement en retard", description: payment.label, link: "/dashboard/mes-paiements" });
    }
  }
}

type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const PAYMENT_STATUSES = ["Payé", "En attente", "En retard"] as const;

function canManage(scope: string | null, commercial: string | null): boolean {
  return !scope || commercial === null || commercial === scope;
}

function revalidateForPayment(payment: Pick<PaymentRecord, "id" | "projectId" | "devisId" | "clientId">): void {
  revalidatePath("/dashboard/finance");
  if (payment.projectId) {
    revalidatePath("/dashboard/projets");
    revalidatePath(`/dashboard/projets/${payment.projectId}`);
  }
  if (payment.devisId) {
    revalidatePath(`/dashboard/devis/${payment.devisId}`);
  }
  if (payment.clientId) {
    revalidatePath(`/dashboard/clients/${payment.clientId}`);
  }
}

function logHistory(payment: PaymentRecord, message: string, actor: string): void {
  ACTIVITY.unshift({
    id: `A-${randomUUID().slice(0, 6).toUpperCase()}`,
    category: "paiement",
    message: `${payment.id} — ${message}`,
    actor,
    timestamp: new Date().toISOString(),
    clientName: payment.clientName,
  });
}

const createPaymentSchema = z.object({
  target: z.string().trim().min(1, "Sélectionnez un projet ou un devis."),
  amount: z.coerce.number().min(1, "Le montant doit être positif."),
  method: z.enum(PAYMENT_METHODS),
  status: z.enum(PAYMENT_STATUSES),
  label: z.string().trim().min(2, "Le libellé est requis."),
  date: z.string().trim().min(1, "La date est requise."),
  notes: z.string().trim().optional().default(""),
});

export async function recordPayment(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requirePermission("finance.manage");
  const scope = getOwnerScope(user);

  const parsed = createPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const [targetType, targetId] = parsed.data.target.split(":");

  let projectId: string | null = null;
  let projectRef: string | null = null;
  let devisId: string | null = null;
  let clientId: string | null = null;
  let clientName: string;

  if (targetType === "project") {
    const project = getProjectById(targetId);
    if (!project) return { ok: false, error: "Projet introuvable." };
    if (!canManage(scope, project.commercial)) return { ok: false, error: "Vous n'avez pas accès à ce projet." };
    projectId = project.id;
    projectRef = project.ref;
    devisId = project.devisId;
    clientId = project.clientId;
    clientName = project.clientName;
  } else if (targetType === "devis") {
    const devis = await getDevisById(targetId);
    if (!devis) return { ok: false, error: "Devis introuvable." };
    if (!canManage(scope, devis.commercial)) return { ok: false, error: "Vous n'avez pas accès à ce devis." };
    devisId = devis.id;
    clientId = devis.clientId;
    clientName = devis.clientName;
  } else {
    return { ok: false, error: "Cible de paiement invalide." };
  }

  const id = nextPaymentId();
  const now = new Date().toISOString();

  const payment: PaymentRecord = {
    id,
    clientId,
    clientName,
    devisId,
    projectId,
    projectRef,
    amount: parsed.data.amount,
    method: parsed.data.method,
    status: parsed.data.status,
    label: parsed.data.label,
    date: new Date(parsed.data.date).toISOString(),
    notes: parsed.data.notes,
    recordedBy: user.name,
    createdAt: now,
  };
  PAYMENTS.unshift(payment);

  logHistory(payment, `Paiement enregistré — ${parsed.data.label} (${parsed.data.status})`, user.name);
  await notifyPaymentStatus(payment);
  revalidateForPayment(payment);

  return { ok: true, data: { id } };
}

async function requirePaymentAccess(paymentId: string) {
  const user = await requirePermission("finance.manage");
  const scope = getOwnerScope(user);
  const payment = getPaymentById(paymentId);
  if (!payment) return { ok: false as const, error: "Paiement introuvable." };

  const project = payment.projectId ? getProjectById(payment.projectId) : null;
  const devis = payment.devisId ? await getDevisById(payment.devisId) : null;
  const commercial = project?.commercial ?? devis?.commercial ?? null;
  if (!canManage(scope, commercial)) return { ok: false as const, error: "Vous n'avez pas accès à ce paiement." };

  return { ok: true as const, payment, user };
}

const updatePaymentSchema = z.object({
  amount: z.coerce.number().min(1, "Le montant doit être positif."),
  method: z.enum(PAYMENT_METHODS),
  status: z.enum(PAYMENT_STATUSES),
  label: z.string().trim().min(2, "Le libellé est requis."),
  date: z.string().trim().min(1, "La date est requise."),
  notes: z.string().trim().optional().default(""),
});

export async function updatePayment(paymentId: string, input: unknown): Promise<ActionResult> {
  const result = await requirePaymentAccess(paymentId);
  if (!result.ok) return result;
  const { payment, user } = result;

  const parsed = updatePaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  payment.amount = parsed.data.amount;
  payment.method = parsed.data.method;
  payment.status = parsed.data.status;
  payment.label = parsed.data.label;
  payment.date = new Date(parsed.data.date).toISOString();
  payment.notes = parsed.data.notes;

  logHistory(payment, "Paiement modifié", user.name);
  revalidateForPayment(payment);

  return { ok: true, data: undefined };
}

const statusSchema = z.object({ status: z.enum(PAYMENT_STATUSES) });

export async function updatePaymentStatus(paymentId: string, status: unknown): Promise<ActionResult> {
  const result = await requirePaymentAccess(paymentId);
  if (!result.ok) return result;
  const { payment, user } = result;

  const parsed = statusSchema.safeParse({ status });
  if (!parsed.success) {
    return { ok: false, error: "Statut invalide." };
  }

  const previous: PaymentStatus = payment.status;
  payment.status = parsed.data.status;
  if (parsed.data.status === "Payé" && previous !== "Payé") {
    payment.date = new Date().toISOString();
  }

  logHistory(payment, `Statut passé à « ${parsed.data.status} »`, user.name);
  if (previous !== payment.status) await notifyPaymentStatus(payment);
  revalidateForPayment(payment);

  return { ok: true, data: undefined };
}

export async function deletePayment(paymentId: string): Promise<ActionResult> {
  const result = await requirePaymentAccess(paymentId);
  if (!result.ok) return result;
  const { payment, user } = result;

  const index = PAYMENTS.findIndex((p) => p.id === paymentId);
  if (index === -1) return { ok: false, error: "Paiement introuvable." };
  PAYMENTS.splice(index, 1);

  logHistory(payment, "Paiement supprimé", user.name);
  revalidateForPayment(payment);

  return { ok: true, data: undefined };
}
