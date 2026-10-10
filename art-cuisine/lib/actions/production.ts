"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/session";
import {
  PRODUCTION_ORDERS,
  PRODUCTION_PIECES,
  PRODUCTION_CHECKLIST_ITEMS,
  QUALITY_CONTROLS,
  PRODUCTION_STAGES,
  PRODUCTION_STAGE_PROGRESS,
  WORKSHOP_TEAM,
  PIECE_STATUSES,
  PROJECT_STAGES,
  PROJECT_PRIORITIES,
  ACTIVITY,
  type ProductionOrderRecord,
  type ProductionStage,
  type ProjectRecord,
} from "@/lib/data/operations";
import { getProjectById, STAGE_PROGRESS } from "@/lib/data/project-records";
import { nextProductionOrderRef, getProductionOrderById } from "@/lib/data/production";
import { getOwnerScope } from "@/lib/data/scope";
import { getClientById } from "@/lib/data/clients";
import { notifyEmail, notifyAdmins } from "@/lib/notify";

type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

function canManage(scope: string | null, commercial: string | null): boolean {
  return !scope || commercial === null || commercial === scope;
}

async function requireOrderAccess(orderId: string) {
  const user = await requirePermission("production.manage");
  const scope = getOwnerScope(user);
  const order = getProductionOrderById(orderId);
  if (!order) return { ok: false as const, error: "Ordre de fabrication introuvable." };
  const project = getProjectById(order.projectId);
  if (!project) return { ok: false as const, error: "Projet introuvable." };
  if (!canManage(scope, project.commercial)) return { ok: false as const, error: "Vous n'avez pas accès à cet ordre de fabrication." };
  return { ok: true as const, order, project, user };
}

function revalidateOrder(id: string, projectId: string): void {
  revalidatePath("/dashboard/production");
  revalidatePath(`/dashboard/production/${id}`);
  revalidatePath("/dashboard/projets");
  revalidatePath(`/dashboard/projets/${projectId}`);
}

/**
 * Keeps the parent project's stage and progress in step with its production
 * order, per "Production status must update the main Project automatically" —
 * called after every mutation that changes an order's stage or progress.
 */
function syncProjectFromProduction(project: ProjectRecord, order: ProductionOrderRecord): void {
  const productionIndex = PROJECT_STAGES.indexOf("Production");
  const vernissageIndex = PROJECT_STAGES.indexOf("Vernissage");
  const currentIndex = PROJECT_STAGES.indexOf(project.stage);

  if (currentIndex < productionIndex) {
    project.stage = "Production";
    project.progress = Math.max(project.progress, STAGE_PROGRESS.Production);
  }

  if (order.stage === "Prêt pour vernissage") {
    if (PROJECT_STAGES.indexOf(project.stage) < vernissageIndex) {
      project.stage = "Vernissage";
    }
    project.progress = Math.max(project.progress, STAGE_PROGRESS.Vernissage);
  } else {
    const span = STAGE_PROGRESS.Vernissage - STAGE_PROGRESS.Production;
    const interpolated = STAGE_PROGRESS.Production + Math.round((order.progress / 100) * span);
    project.progress = Math.max(project.progress, interpolated);
  }
}

function logHistory(order: ProductionOrderRecord, message: string, actor: string): void {
  ACTIVITY.unshift({
    id: `A-${randomUUID().slice(0, 6).toUpperCase()}`,
    category: "production",
    message: `${order.ref} — ${message}`,
    actor,
    timestamp: new Date().toISOString(),
    clientName: order.clientName,
  });
}

const createOrderSchema = z.object({
  projectId: z.string().trim().min(1, "Sélectionnez un projet."),
  priority: z.enum(PROJECT_PRIORITIES),
  deadline: z.string().trim().min(1, "L'échéance est requise."),
  assignedWorkers: z.array(z.string()).optional().default([]),
  workshopNotes: z.string().trim().optional().default(""),
});

export async function createProductionOrder(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requirePermission("production.manage");
  const scope = getOwnerScope(user);

  const parsed = createOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const project = getProjectById(parsed.data.projectId);
  if (!project) return { ok: false, error: "Projet introuvable." };
  if (!canManage(scope, project.commercial)) return { ok: false, error: "Vous n'avez pas accès à ce projet." };
  if (project.designStatus !== "Validé") {
    return { ok: false, error: "Le design doit être validé par le client avant de lancer la production." };
  }

  const id = `PO-${randomUUID().slice(0, 8).toUpperCase()}`;
  const ref = nextProductionOrderRef();
  const stage: ProductionStage = "À préparer";
  const now = new Date().toISOString();

  const order: ProductionOrderRecord = {
    id,
    ref,
    projectId: project.id,
    projectRef: project.ref,
    clientName: project.clientName,
    stage,
    priority: parsed.data.priority,
    assignedWorkers: parsed.data.assignedWorkers.filter((w) => (WORKSHOP_TEAM as readonly string[]).includes(w)),
    startDate: now,
    deadline: new Date(parsed.data.deadline).toISOString(),
    progress: PRODUCTION_STAGE_PROGRESS[stage],
    workshopNotes: parsed.data.workshopNotes,
    createdBy: user.name,
    createdAt: now,
    updatedAt: now,
  };
  PRODUCTION_ORDERS.unshift(order);

  syncProjectFromProduction(project, order);
  logHistory(order, `Ordre de fabrication créé pour ${project.name}`, user.name);

  if (project.clientId) {
    const client = await getClientById(project.clientId);
    if (client) {
      notifyEmail(client.email, { type: "production_started", title: "Production démarrée", description: `${project.ref} — ${project.name}`, link: "/dashboard/mes-projets" });
    }
  }

  revalidateOrder(id, project.id);
  return { ok: true, data: { id } };
}

const updateOrderSchema = z.object({
  priority: z.enum(PROJECT_PRIORITIES),
  deadline: z.string().trim().min(1, "L'échéance est requise."),
  assignedWorkers: z.array(z.string()).optional().default([]),
});

export async function updateProductionOrder(orderId: string, input: unknown): Promise<ActionResult> {
  const result = await requireOrderAccess(orderId);
  if (!result.ok) return result;
  const { order, project } = result;

  const parsed = updateOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  order.priority = parsed.data.priority;
  order.deadline = new Date(parsed.data.deadline).toISOString();
  order.assignedWorkers = parsed.data.assignedWorkers.filter((w) => (WORKSHOP_TEAM as readonly string[]).includes(w));
  order.updatedAt = new Date().toISOString();

  revalidateOrder(orderId, project.id);
  return { ok: true, data: undefined };
}

const stageSchema = z.object({ stage: z.enum(PRODUCTION_STAGES) });

export async function updateProductionStage(orderId: string, stage: unknown): Promise<ActionResult> {
  const result = await requireOrderAccess(orderId);
  if (!result.ok) return result;
  const { order, project, user } = result;

  const parsed = stageSchema.safeParse({ stage });
  if (!parsed.success) {
    return { ok: false, error: "Étape invalide." };
  }

  order.stage = parsed.data.stage;
  order.progress = PRODUCTION_STAGE_PROGRESS[parsed.data.stage];
  order.updatedAt = new Date().toISOString();

  syncProjectFromProduction(project, order);
  logHistory(order, `Étape passée à « ${parsed.data.stage} »`, user.name);

  if (parsed.data.stage !== "Prêt pour vernissage" && new Date(order.deadline).getTime() < Date.now()) {
    notifyAdmins({ type: "production_delayed", title: "Production en retard", description: `${order.ref} — ${project.name} (échéance dépassée)`, link: `/dashboard/production/${orderId}` });
  }

  revalidateOrder(orderId, project.id);
  return { ok: true, data: undefined };
}

const progressSchema = z.object({ progress: z.coerce.number().min(0).max(100) });

export async function updateProductionProgress(orderId: string, input: unknown): Promise<ActionResult> {
  const result = await requireOrderAccess(orderId);
  if (!result.ok) return result;
  const { order, project } = result;

  const parsed = progressSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Avancement invalide." };
  }

  order.progress = parsed.data.progress;
  order.updatedAt = new Date().toISOString();

  syncProjectFromProduction(project, order);

  revalidateOrder(orderId, project.id);
  return { ok: true, data: undefined };
}

const notesSchema = z.object({ notes: z.string().trim().optional().default("") });

export async function updateWorkshopNotes(orderId: string, input: unknown): Promise<ActionResult> {
  const result = await requireOrderAccess(orderId);
  if (!result.ok) return result;
  const { order, project } = result;

  const parsed = notesSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Notes invalides." };
  }

  order.workshopNotes = parsed.data.notes;
  order.updatedAt = new Date().toISOString();

  revalidateOrder(orderId, project.id);
  return { ok: true, data: undefined };
}

// --- Pieces ------------------------------------------------------------------

const pieceSchema = z.object({
  name: z.string().trim().min(2, "Le nom de la pièce est requis."),
  material: z.string().trim().min(2, "Le matériau est requis."),
  quantity: z.coerce.number().min(1, "La quantité doit être positive."),
  unit: z.string().trim().min(1, "L'unité est requise."),
});

export async function addProductionPiece(orderId: string, input: unknown): Promise<ActionResult> {
  const result = await requireOrderAccess(orderId);
  if (!result.ok) return result;
  const { project } = result;

  const parsed = pieceSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  PRODUCTION_PIECES.unshift({
    id: `PC-${randomUUID().slice(0, 8).toUpperCase()}`,
    orderId,
    name: parsed.data.name,
    material: parsed.data.material,
    quantity: parsed.data.quantity,
    unit: parsed.data.unit,
    status: "À faire",
  });

  revalidateOrder(orderId, project.id);
  return { ok: true, data: undefined };
}

const pieceStatusSchema = z.object({ status: z.enum(PIECE_STATUSES) });

export async function updatePieceStatus(pieceId: string, orderId: string, status: unknown): Promise<ActionResult> {
  const result = await requireOrderAccess(orderId);
  if (!result.ok) return result;
  const { project } = result;

  const parsed = pieceStatusSchema.safeParse({ status });
  if (!parsed.success) {
    return { ok: false, error: "Statut invalide." };
  }

  const piece = PRODUCTION_PIECES.find((p) => p.id === pieceId);
  if (!piece) return { ok: false, error: "Pièce introuvable." };

  piece.status = parsed.data.status;

  revalidateOrder(orderId, project.id);
  return { ok: true, data: undefined };
}

export async function removeProductionPiece(pieceId: string, orderId: string): Promise<ActionResult> {
  const result = await requireOrderAccess(orderId);
  if (!result.ok) return result;
  const { project } = result;

  const index = PRODUCTION_PIECES.findIndex((p) => p.id === pieceId && p.orderId === orderId);
  if (index === -1) return { ok: false, error: "Pièce introuvable." };
  PRODUCTION_PIECES.splice(index, 1);

  revalidateOrder(orderId, project.id);
  return { ok: true, data: undefined };
}

// --- Checklist -----------------------------------------------------------------

export async function toggleChecklistItem(itemId: string, orderId: string): Promise<ActionResult> {
  const result = await requireOrderAccess(orderId);
  if (!result.ok) return result;
  const { project } = result;

  const item = PRODUCTION_CHECKLIST_ITEMS.find((c) => c.id === itemId);
  if (!item) return { ok: false, error: "Élément de checklist introuvable." };

  item.done = !item.done;

  revalidateOrder(orderId, project.id);
  return { ok: true, data: undefined };
}

const checklistItemSchema = z.object({
  stage: z.enum(PRODUCTION_STAGES),
  label: z.string().trim().min(2, "Le libellé est requis."),
});

export async function addChecklistItem(orderId: string, input: unknown): Promise<ActionResult> {
  const result = await requireOrderAccess(orderId);
  if (!result.ok) return result;
  const { project } = result;

  const parsed = checklistItemSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  PRODUCTION_CHECKLIST_ITEMS.push({
    id: `CHK-${randomUUID().slice(0, 8).toUpperCase()}`,
    orderId,
    stage: parsed.data.stage,
    label: parsed.data.label,
    done: false,
  });

  revalidateOrder(orderId, project.id);
  return { ok: true, data: undefined };
}

// --- Quality control & rework --------------------------------------------------

const qcSchema = z.object({
  result: z.enum(["Conforme", "Non conforme"]),
  notes: z.string().trim().min(3, "Merci de préciser le constat."),
});

/**
 * Records a quality-control review. A pass moves the order to its final
 * stage (unlocking Vernissage on the project); a fail sends it back to
 * Assemblage for rework — the rework itself is just this same loop repeated.
 */
export async function recordQualityControl(orderId: string, input: unknown): Promise<ActionResult> {
  const result = await requireOrderAccess(orderId);
  if (!result.ok) return result;
  const { order, project, user } = result;

  const parsed = qcSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  QUALITY_CONTROLS.unshift({
    id: `QC-${randomUUID().slice(0, 8).toUpperCase()}`,
    orderId,
    result: parsed.data.result,
    notes: parsed.data.notes,
    checkedBy: user.name,
    checkedAt: new Date().toISOString(),
  });

  if (parsed.data.result === "Conforme") {
    order.stage = "Prêt pour vernissage";
    order.progress = PRODUCTION_STAGE_PROGRESS["Prêt pour vernissage"];
    logHistory(order, "Contrôle qualité conforme — prêt pour vernissage", user.name);
  } else {
    order.stage = "Assemblage";
    order.progress = PRODUCTION_STAGE_PROGRESS.Assemblage;
    logHistory(order, `Contrôle qualité non conforme — retour en reprise (${parsed.data.notes})`, user.name);
    notifyAdmins({ type: "quality_issue", title: "Problème qualité détecté", description: `${order.ref} — ${project.name} : ${parsed.data.notes}`, link: `/dashboard/production/${orderId}` });
  }
  order.updatedAt = new Date().toISOString();

  syncProjectFromProduction(project, order);

  revalidateOrder(orderId, project.id);
  return { ok: true, data: undefined };
}
