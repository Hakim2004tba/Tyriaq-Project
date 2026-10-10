"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/session";
import {
  VERNISSAGE_JOBS,
  VERNISSAGE_PIECES,
  VERNISSAGE_CHECKLIST_ITEMS,
  VERNISSAGE_QUALITY_CONTROLS,
  VERNISSAGE_STAGES,
  VERNISSAGE_STAGE_PROGRESS,
  VERNISSAGE_TEAM,
  VERNISSAGE_FINISHES,
  PIECE_STATUSES,
  PROJECT_STAGES,
  PROJECT_PRIORITIES,
  ACTIVITY,
  type VernissageJobRecord,
  type VernissageStage,
  type ProjectRecord,
} from "@/lib/data/operations";
import { getProjectById, STAGE_PROGRESS } from "@/lib/data/project-records";
import { nextVernissageJobRef, getVernissageJobById, getVernisseurScope, canAccessVernissageJob } from "@/lib/data/vernissage";
import { CABINET_FINISHES } from "@/lib/design/kitchen-svg";
import { notifyByName, notifyAdmins } from "@/lib/notify";

type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

async function requireJobAccess(jobId: string) {
  const user = await requirePermission("vernissage.manage");
  const scope = getVernisseurScope(user);
  const job = getVernissageJobById(jobId);
  if (!job) return { ok: false as const, error: "Job de vernissage introuvable." };
  if (!canAccessVernissageJob(scope, job)) return { ok: false as const, error: "Vous n'avez pas accès à ce job." };
  const project = getProjectById(job.projectId);
  if (!project) return { ok: false as const, error: "Projet introuvable." };
  return { ok: true as const, job, project, user };
}

function revalidateJob(id: string, projectId: string): void {
  revalidatePath("/dashboard/vernissage");
  revalidatePath(`/dashboard/vernissage/${id}`);
  revalidatePath("/dashboard/projets");
  revalidatePath(`/dashboard/projets/${projectId}`);
}

/**
 * Keeps the parent project's stage and progress in step with its vernissage
 * job — the same auto-sync contract established for production orders.
 */
function syncProjectFromVernissage(project: ProjectRecord, job: VernissageJobRecord): void {
  const vernissageIndex = PROJECT_STAGES.indexOf("Vernissage");
  const qualityIndex = PROJECT_STAGES.indexOf("Contrôle qualité");
  const currentIndex = PROJECT_STAGES.indexOf(project.stage);

  if (currentIndex < vernissageIndex) {
    project.stage = "Vernissage";
    project.progress = Math.max(project.progress, STAGE_PROGRESS.Vernissage);
  }

  if (job.stage === "Terminé") {
    if (PROJECT_STAGES.indexOf(project.stage) < qualityIndex) {
      project.stage = "Contrôle qualité";
    }
    project.progress = Math.max(project.progress, STAGE_PROGRESS["Contrôle qualité"]);
  } else {
    const span = STAGE_PROGRESS["Contrôle qualité"] - STAGE_PROGRESS.Vernissage;
    const interpolated = STAGE_PROGRESS.Vernissage + Math.round((job.progress / 100) * span);
    project.progress = Math.max(project.progress, interpolated);
  }
}

function logHistory(job: VernissageJobRecord, message: string, actor: string): void {
  ACTIVITY.unshift({
    id: `A-${randomUUID().slice(0, 6).toUpperCase()}`,
    category: "vernissage",
    message: `${job.ref} — ${message}`,
    actor,
    timestamp: new Date().toISOString(),
    clientName: job.clientName,
  });
}

const createJobSchema = z.object({
  projectId: z.string().trim().min(1, "Sélectionnez un projet."),
  priority: z.enum(PROJECT_PRIORITIES),
  color: z.string().trim().min(1, "Sélectionnez une couleur."),
  finish: z.enum(VERNISSAGE_FINISHES),
  deadline: z.string().trim().min(1, "L'échéance est requise."),
  assignedVernisseurs: z.array(z.string()).optional().default([]),
  notes: z.string().trim().optional().default(""),
});

export async function createVernissageJob(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requirePermission("vernissage.manage");

  const parsed = createJobSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const project = getProjectById(parsed.data.projectId);
  if (!project) return { ok: false, error: "Projet introuvable." };

  const vernissageIndex = PROJECT_STAGES.indexOf("Vernissage");
  if (PROJECT_STAGES.indexOf(project.stage) < vernissageIndex) {
    return { ok: false, error: "La production doit être terminée avant de lancer le vernissage." };
  }

  const id = `VJ-${randomUUID().slice(0, 8).toUpperCase()}`;
  const ref = nextVernissageJobRef();
  const stage: VernissageStage = "À vernir";
  const now = new Date().toISOString();

  const job: VernissageJobRecord = {
    id,
    ref,
    projectId: project.id,
    projectRef: project.ref,
    clientName: project.clientName,
    stage,
    priority: parsed.data.priority,
    assignedVernisseurs: parsed.data.assignedVernisseurs.filter((w) => (VERNISSAGE_TEAM as readonly string[]).includes(w)),
    color: (CABINET_FINISHES as readonly { hex: string }[]).some((f) => f.hex === parsed.data.color) ? parsed.data.color : CABINET_FINISHES[0].hex,
    finish: parsed.data.finish,
    deadline: new Date(parsed.data.deadline).toISOString(),
    progress: VERNISSAGE_STAGE_PROGRESS[stage],
    notes: parsed.data.notes,
    approvedAt: null,
    createdBy: user.name,
    createdAt: now,
    updatedAt: now,
  };
  VERNISSAGE_JOBS.unshift(job);

  syncProjectFromVernissage(project, job);
  logHistory(job, `Job de vernissage créé pour ${project.name}`, user.name);

  for (const vernisseur of job.assignedVernisseurs) {
    notifyByName(vernisseur, { type: "vernissage_assigned", title: "Vernissage assigné", description: `${job.ref} — ${project.name}`, link: `/dashboard/vernissage/${id}` });
  }

  revalidateJob(id, project.id);
  return { ok: true, data: { id } };
}

const updateJobSchema = z.object({
  priority: z.enum(PROJECT_PRIORITIES),
  color: z.string().trim().min(1),
  finish: z.enum(VERNISSAGE_FINISHES),
  deadline: z.string().trim().min(1, "L'échéance est requise."),
  assignedVernisseurs: z.array(z.string()).optional().default([]),
});

export async function updateVernissageJob(jobId: string, input: unknown): Promise<ActionResult> {
  const result = await requireJobAccess(jobId);
  if (!result.ok) return result;
  const { job, project } = result;

  const parsed = updateJobSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  job.priority = parsed.data.priority;
  job.color = (CABINET_FINISHES as readonly { hex: string }[]).some((f) => f.hex === parsed.data.color) ? parsed.data.color : job.color;
  job.finish = parsed.data.finish;
  job.deadline = new Date(parsed.data.deadline).toISOString();
  job.assignedVernisseurs = parsed.data.assignedVernisseurs.filter((w) => (VERNISSAGE_TEAM as readonly string[]).includes(w));
  job.updatedAt = new Date().toISOString();

  revalidateJob(jobId, project.id);
  return { ok: true, data: undefined };
}

const stageSchema = z.object({ stage: z.enum(VERNISSAGE_STAGES) });

export async function updateVernissageStage(jobId: string, stage: unknown): Promise<ActionResult> {
  const result = await requireJobAccess(jobId);
  if (!result.ok) return result;
  const { job, project, user } = result;

  const parsed = stageSchema.safeParse({ stage });
  if (!parsed.success) {
    return { ok: false, error: "Étape invalide." };
  }

  job.stage = parsed.data.stage;
  job.progress = VERNISSAGE_STAGE_PROGRESS[parsed.data.stage];
  job.updatedAt = new Date().toISOString();

  syncProjectFromVernissage(project, job);
  logHistory(job, `Étape passée à « ${parsed.data.stage} »`, user.name);

  revalidateJob(jobId, project.id);
  return { ok: true, data: undefined };
}

const notesSchema = z.object({ notes: z.string().trim().optional().default("") });

export async function updateVernissageNotes(jobId: string, input: unknown): Promise<ActionResult> {
  const result = await requireJobAccess(jobId);
  if (!result.ok) return result;
  const { job, project } = result;

  const parsed = notesSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Notes invalides." };
  }

  job.notes = parsed.data.notes;
  job.updatedAt = new Date().toISOString();

  revalidateJob(jobId, project.id);
  return { ok: true, data: undefined };
}

// --- Pieces ------------------------------------------------------------------

const pieceSchema = z.object({
  name: z.string().trim().min(2, "Le nom de la pièce est requis."),
  material: z.string().trim().min(2, "Le matériau est requis."),
  quantity: z.coerce.number().min(1, "La quantité doit être positive."),
  unit: z.string().trim().min(1, "L'unité est requise."),
});

export async function addVernissagePiece(jobId: string, input: unknown): Promise<ActionResult> {
  const result = await requireJobAccess(jobId);
  if (!result.ok) return result;
  const { project } = result;

  const parsed = pieceSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  VERNISSAGE_PIECES.unshift({
    id: `VP-${randomUUID().slice(0, 8).toUpperCase()}`,
    jobId,
    name: parsed.data.name,
    material: parsed.data.material,
    quantity: parsed.data.quantity,
    unit: parsed.data.unit,
    status: "À faire",
  });

  revalidateJob(jobId, project.id);
  return { ok: true, data: undefined };
}

const pieceStatusSchema = z.object({ status: z.enum(PIECE_STATUSES) });

export async function updateVernissagePieceStatus(pieceId: string, jobId: string, status: unknown): Promise<ActionResult> {
  const result = await requireJobAccess(jobId);
  if (!result.ok) return result;
  const { project } = result;

  const parsed = pieceStatusSchema.safeParse({ status });
  if (!parsed.success) {
    return { ok: false, error: "Statut invalide." };
  }

  const piece = VERNISSAGE_PIECES.find((p) => p.id === pieceId);
  if (!piece) return { ok: false, error: "Pièce introuvable." };

  piece.status = parsed.data.status;

  revalidateJob(jobId, project.id);
  return { ok: true, data: undefined };
}

export async function removeVernissagePiece(pieceId: string, jobId: string): Promise<ActionResult> {
  const result = await requireJobAccess(jobId);
  if (!result.ok) return result;
  const { project } = result;

  const index = VERNISSAGE_PIECES.findIndex((p) => p.id === pieceId && p.jobId === jobId);
  if (index === -1) return { ok: false, error: "Pièce introuvable." };
  VERNISSAGE_PIECES.splice(index, 1);

  revalidateJob(jobId, project.id);
  return { ok: true, data: undefined };
}

// --- Checklist -----------------------------------------------------------------

export async function toggleVernissageChecklistItem(itemId: string, jobId: string): Promise<ActionResult> {
  const result = await requireJobAccess(jobId);
  if (!result.ok) return result;
  const { project } = result;

  const item = VERNISSAGE_CHECKLIST_ITEMS.find((c) => c.id === itemId);
  if (!item) return { ok: false, error: "Élément de checklist introuvable." };

  item.done = !item.done;

  revalidateJob(jobId, project.id);
  return { ok: true, data: undefined };
}

const checklistItemSchema = z.object({
  stage: z.enum(VERNISSAGE_STAGES),
  label: z.string().trim().min(2, "Le libellé est requis."),
});

export async function addVernissageChecklistItem(jobId: string, input: unknown): Promise<ActionResult> {
  const result = await requireJobAccess(jobId);
  if (!result.ok) return result;
  const { project } = result;

  const parsed = checklistItemSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  VERNISSAGE_CHECKLIST_ITEMS.push({
    id: `VCHK-${randomUUID().slice(0, 8).toUpperCase()}`,
    jobId,
    stage: parsed.data.stage,
    label: parsed.data.label,
    done: false,
  });

  revalidateJob(jobId, project.id);
  return { ok: true, data: undefined };
}

// --- Quality control, rework & final approval -----------------------------------

const qcSchema = z.object({
  result: z.enum(["Conforme", "Non conforme"]),
  notes: z.string().trim().min(3, "Merci de préciser le constat."),
});

/**
 * Records a quality-control review. A pass gives final approval and marks
 * the job Terminé (unlocking Contrôle qualité on the project); a fail sends
 * it back to Ponçage for rework.
 */
export async function recordVernissageQualityControl(jobId: string, input: unknown): Promise<ActionResult> {
  const result = await requireJobAccess(jobId);
  if (!result.ok) return result;
  const { job, project, user } = result;

  const parsed = qcSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  VERNISSAGE_QUALITY_CONTROLS.unshift({
    id: `VQC-${randomUUID().slice(0, 8).toUpperCase()}`,
    jobId,
    result: parsed.data.result,
    notes: parsed.data.notes,
    checkedBy: user.name,
    checkedAt: new Date().toISOString(),
  });

  if (parsed.data.result === "Conforme") {
    job.stage = "Terminé";
    job.progress = VERNISSAGE_STAGE_PROGRESS.Terminé;
    job.approvedAt = new Date().toISOString();
    logHistory(job, "Contrôle qualité conforme — approbation finale", user.name);
  } else {
    job.stage = "Ponçage";
    job.progress = VERNISSAGE_STAGE_PROGRESS.Ponçage;
    logHistory(job, `Contrôle qualité non conforme — retour en reprise (${parsed.data.notes})`, user.name);
    notifyAdmins({ type: "quality_issue", title: "Problème qualité détecté", description: `${job.ref} — ${project.name} : ${parsed.data.notes}`, link: `/dashboard/vernissage/${jobId}` });
  }
  job.updatedAt = new Date().toISOString();

  syncProjectFromVernissage(project, job);

  revalidateJob(jobId, project.id);
  return { ok: true, data: undefined };
}
