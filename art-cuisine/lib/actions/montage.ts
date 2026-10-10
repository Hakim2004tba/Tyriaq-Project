"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/session";
import {
  MONTAGE_JOBS,
  MONTAGE_MISSING_PIECES,
  MONTAGE_CHECKLIST_ITEMS,
  MONTAGE_PHOTOS,
  MONTAGE_STAGES,
  MONTAGE_STAGE_PROGRESS,
  MONTAGE_TEAM,
  MONTAGE_VEHICLES,
  MISSING_PIECE_STATUSES,
  MONTAGE_PHOTO_PHASES,
  PROJECT_STAGES,
  PROJECT_PRIORITIES,
  ACTIVITY,
  type MontageJobRecord,
  type MontageStage,
  type ProjectRecord,
} from "@/lib/data/operations";
import { getProjectById, STAGE_PROGRESS } from "@/lib/data/project-records";
import { formatShortDateTime } from "@/lib/format";
import { nextMontageJobRef, getMontageJobById, getMontageScope, canAccessMontageJob } from "@/lib/data/montage";
import { getClientById } from "@/lib/data/clients";
import { notifyEmail, notifyAdmins } from "@/lib/notify";

type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

async function requireJobAccess(jobId: string, options: { allowCancelled?: boolean } = {}) {
  const user = await requirePermission("montage.manage");
  const scope = getMontageScope(user);
  const job = getMontageJobById(jobId);
  if (!job) return { ok: false as const, error: "Installation introuvable." };
  if (!canAccessMontageJob(scope, job)) return { ok: false as const, error: "Vous n'avez pas accès à cette installation." };
  if (job.cancelled && !options.allowCancelled) return { ok: false as const, error: "Cette installation a été annulée." };
  const project = getProjectById(job.projectId);
  if (!project) return { ok: false as const, error: "Projet introuvable." };
  return { ok: true as const, job, project, user };
}

function normalizeVehicle(value: string | null | undefined): string | null {
  return value && (MONTAGE_VEHICLES as readonly string[]).includes(value) ? value : null;
}

function revalidateJob(id: string, projectId: string): void {
  revalidatePath("/dashboard/montage");
  revalidatePath(`/dashboard/montage/${id}`);
  revalidatePath("/dashboard/projets");
  revalidatePath(`/dashboard/projets/${projectId}`);
}

/**
 * Keeps the parent project's stage and progress in step with its montage
 * job — the same auto-sync contract established for production orders and
 * vernissage jobs.
 */
function syncProjectFromMontage(project: ProjectRecord, job: MontageJobRecord): void {
  const montageIndex = PROJECT_STAGES.indexOf("Montage");
  const receptionIndex = PROJECT_STAGES.indexOf("Réception");
  const currentIndex = PROJECT_STAGES.indexOf(project.stage);

  if (currentIndex < montageIndex) {
    project.stage = "Montage";
    project.progress = Math.max(project.progress, STAGE_PROGRESS.Montage);
  }

  if (job.stage === "Terminé") {
    if (PROJECT_STAGES.indexOf(project.stage) < receptionIndex) {
      project.stage = "Réception";
    }
    project.progress = Math.max(project.progress, STAGE_PROGRESS.Réception);
  } else {
    const span = STAGE_PROGRESS.Réception - STAGE_PROGRESS.Montage;
    const interpolated = STAGE_PROGRESS.Montage + Math.round((job.progress / 100) * span);
    project.progress = Math.max(project.progress, interpolated);
  }
}

function logHistory(job: MontageJobRecord, message: string, actor: string): void {
  ACTIVITY.unshift({
    id: `A-${randomUUID().slice(0, 6).toUpperCase()}`,
    category: "montage",
    message: `${job.ref} — ${message}`,
    actor,
    timestamp: new Date().toISOString(),
    clientName: job.clientName,
  });
}

const createJobSchema = z.object({
  projectId: z.string().trim().min(1, "Sélectionnez un projet."),
  priority: z.enum(PROJECT_PRIORITIES),
  scheduledDate: z.string().trim().min(1, "La date d'intervention est requise."),
  assignedTeam: z.array(z.string()).optional().default([]),
  assignedVehicle: z.string().trim().optional().nullable(),
  instructions: z.string().trim().optional().default(""),
});

export async function createMontageJob(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requirePermission("montage.manage");

  const parsed = createJobSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const project = getProjectById(parsed.data.projectId);
  if (!project) return { ok: false, error: "Projet introuvable." };

  const montageIndex = PROJECT_STAGES.indexOf("Montage");
  if (PROJECT_STAGES.indexOf(project.stage) < montageIndex) {
    return { ok: false, error: "Le vernissage doit être terminé avant de planifier la pose." };
  }

  const id = `MJ-${randomUUID().slice(0, 8).toUpperCase()}`;
  const ref = nextMontageJobRef();
  const stage: MontageStage = "Planifié";
  const now = new Date().toISOString();

  const job: MontageJobRecord = {
    id,
    ref,
    projectId: project.id,
    projectRef: project.ref,
    clientName: project.clientName,
    stage,
    priority: parsed.data.priority,
    assignedTeam: parsed.data.assignedTeam.filter((w) => (MONTAGE_TEAM as readonly string[]).includes(w)),
    assignedVehicle: normalizeVehicle(parsed.data.assignedVehicle),
    scheduledDate: new Date(parsed.data.scheduledDate).toISOString(),
    instructions: parsed.data.instructions,
    cancelled: false,
    cancelledAt: null,
    cancelledReason: null,
    signatureDataUrl: null,
    signedBy: null,
    signedAt: null,
    progress: MONTAGE_STAGE_PROGRESS[stage],
    createdBy: user.name,
    createdAt: now,
    updatedAt: now,
  };
  MONTAGE_JOBS.unshift(job);

  syncProjectFromMontage(project, job);
  logHistory(job, `Installation planifiée pour ${project.name}`, user.name);

  if (project.clientId) {
    const client = await getClientById(project.clientId);
    if (client) {
      notifyEmail(client.email, { type: "montage_scheduled", title: "Installation planifiée", description: `${project.name} — ${formatShortDateTime(job.scheduledDate)}`, link: "/dashboard/mes-projets" });
    }
  }

  revalidateJob(id, project.id);
  return { ok: true, data: { id } };
}

const updateJobSchema = z.object({
  priority: z.enum(PROJECT_PRIORITIES),
  scheduledDate: z.string().trim().min(1, "La date d'intervention est requise."),
  assignedTeam: z.array(z.string()).optional().default([]),
  assignedVehicle: z.string().trim().optional().nullable(),
});

export async function updateMontageJob(jobId: string, input: unknown): Promise<ActionResult> {
  const result = await requireJobAccess(jobId);
  if (!result.ok) return result;
  const { job, project, user } = result;

  const parsed = updateJobSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const newScheduledDate = new Date(parsed.data.scheduledDate).toISOString();
  const rescheduled = newScheduledDate !== job.scheduledDate;
  const previousDate = job.scheduledDate;

  job.priority = parsed.data.priority;
  job.scheduledDate = newScheduledDate;
  job.assignedTeam = parsed.data.assignedTeam.filter((w) => (MONTAGE_TEAM as readonly string[]).includes(w));
  job.assignedVehicle = normalizeVehicle(parsed.data.assignedVehicle);
  job.updatedAt = new Date().toISOString();

  if (rescheduled) {
    logHistory(job, `Installation reprogrammée du ${formatShortDateTime(previousDate)} au ${formatShortDateTime(newScheduledDate)}`, user.name);
    if (new Date(newScheduledDate).getTime() > new Date(previousDate).getTime()) {
      notifyAdmins({ type: "montage_delayed", title: "Installation reportée", description: `${job.ref} — ${project.name} reportée au ${formatShortDateTime(newScheduledDate)}`, link: `/dashboard/montage/${jobId}` });
      if (project.clientId) {
        const client = await getClientById(project.clientId);
        if (client) {
          notifyEmail(client.email, { type: "montage_delayed", title: "Installation reportée", description: `${project.name} — nouvelle date : ${formatShortDateTime(newScheduledDate)}`, link: "/dashboard/mes-projets" });
        }
      }
    }
  }

  revalidateJob(jobId, project.id);
  return { ok: true, data: undefined };
}

const cancelJobSchema = z.object({ reason: z.string().trim().min(3, "Merci de préciser le motif de l'annulation.") });

export async function cancelMontageJob(jobId: string, input: unknown): Promise<ActionResult> {
  const result = await requireJobAccess(jobId, { allowCancelled: true });
  if (!result.ok) return result;
  const { job, project, user } = result;

  if (job.cancelled) return { ok: false, error: "Cette installation est déjà annulée." };
  if (job.stage === "Terminé") return { ok: false, error: "Impossible d'annuler une installation déjà terminée." };

  const parsed = cancelJobSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  job.cancelled = true;
  job.cancelledAt = new Date().toISOString();
  job.cancelledReason = parsed.data.reason;
  job.updatedAt = job.cancelledAt;

  logHistory(job, `Installation annulée — ${parsed.data.reason}`, user.name);

  revalidateJob(jobId, project.id);
  return { ok: true, data: undefined };
}

const stageSchema = z.object({ stage: z.enum(MONTAGE_STAGES) });

export async function updateMontageStage(jobId: string, stage: unknown): Promise<ActionResult> {
  const result = await requireJobAccess(jobId);
  if (!result.ok) return result;
  const { job, project, user } = result;

  const parsed = stageSchema.safeParse({ stage });
  if (!parsed.success) {
    return { ok: false, error: "Étape invalide." };
  }
  if (parsed.data.stage === "Terminé" && !job.signedAt) {
    return { ok: false, error: "La signature du client est requise avant de clôturer l'installation." };
  }

  job.stage = parsed.data.stage;
  job.progress = MONTAGE_STAGE_PROGRESS[parsed.data.stage];
  job.updatedAt = new Date().toISOString();

  syncProjectFromMontage(project, job);
  logHistory(job, `Étape passée à « ${parsed.data.stage} »`, user.name);

  revalidateJob(jobId, project.id);
  return { ok: true, data: undefined };
}

const notesSchema = z.object({ notes: z.string().trim().optional().default("") });

export async function updateMontageInstructions(jobId: string, input: unknown): Promise<ActionResult> {
  const result = await requireJobAccess(jobId);
  if (!result.ok) return result;
  const { job, project } = result;

  const parsed = notesSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Notes invalides." };
  }

  job.instructions = parsed.data.notes;
  job.updatedAt = new Date().toISOString();

  revalidateJob(jobId, project.id);
  return { ok: true, data: undefined };
}

// --- Missing pieces --------------------------------------------------------------

const missingPieceSchema = z.object({
  name: z.string().trim().min(2, "Le nom de la pièce est requis."),
  quantity: z.coerce.number().min(1, "La quantité doit être positive."),
});

export async function addMissingPiece(jobId: string, input: unknown): Promise<ActionResult> {
  const result = await requireJobAccess(jobId);
  if (!result.ok) return result;
  const { project } = result;

  const parsed = missingPieceSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  MONTAGE_MISSING_PIECES.unshift({
    id: `MP-${randomUUID().slice(0, 8).toUpperCase()}`,
    jobId,
    name: parsed.data.name,
    quantity: parsed.data.quantity,
    status: "Signalée",
    reportedAt: new Date().toISOString(),
  });

  revalidateJob(jobId, project.id);
  return { ok: true, data: undefined };
}

const missingPieceStatusSchema = z.object({ status: z.enum(MISSING_PIECE_STATUSES) });

export async function updateMissingPieceStatus(pieceId: string, jobId: string, status: unknown): Promise<ActionResult> {
  const result = await requireJobAccess(jobId);
  if (!result.ok) return result;
  const { project } = result;

  const parsed = missingPieceStatusSchema.safeParse({ status });
  if (!parsed.success) {
    return { ok: false, error: "Statut invalide." };
  }

  const piece = MONTAGE_MISSING_PIECES.find((p) => p.id === pieceId);
  if (!piece) return { ok: false, error: "Pièce introuvable." };

  piece.status = parsed.data.status;

  revalidateJob(jobId, project.id);
  return { ok: true, data: undefined };
}

// --- Checklist -----------------------------------------------------------------

export async function toggleMontageChecklistItem(itemId: string, jobId: string): Promise<ActionResult> {
  const result = await requireJobAccess(jobId);
  if (!result.ok) return result;
  const { project } = result;

  const item = MONTAGE_CHECKLIST_ITEMS.find((c) => c.id === itemId);
  if (!item) return { ok: false, error: "Élément de checklist introuvable." };

  item.done = !item.done;

  revalidateJob(jobId, project.id);
  return { ok: true, data: undefined };
}

const checklistItemSchema = z.object({
  stage: z.enum(MONTAGE_STAGES),
  label: z.string().trim().min(2, "Le libellé est requis."),
});

export async function addMontageChecklistItem(jobId: string, input: unknown): Promise<ActionResult> {
  const result = await requireJobAccess(jobId);
  if (!result.ok) return result;
  const { project } = result;

  const parsed = checklistItemSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  MONTAGE_CHECKLIST_ITEMS.push({
    id: `MCHK-${randomUUID().slice(0, 8).toUpperCase()}`,
    jobId,
    stage: parsed.data.stage,
    label: parsed.data.label,
    done: false,
  });

  revalidateJob(jobId, project.id);
  return { ok: true, data: undefined };
}

// --- Photos (before / during / after) --------------------------------------------

const MAX_FILE_BYTES = 8 * 1024 * 1024;

export async function uploadMontagePhoto(jobId: string, formData: FormData): Promise<ActionResult> {
  const result = await requireJobAccess(jobId);
  if (!result.ok) return result;
  const { job, project, user } = result;

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Merci de sélectionner un fichier." };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, error: "Le fichier dépasse la taille maximale autorisée (8 Mo)." };
  }

  const phaseParsed = z.enum(MONTAGE_PHOTO_PHASES).safeParse(formData.get("phase"));
  if (!phaseParsed.success) {
    return { ok: false, error: "Phase invalide." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || "application/octet-stream";
  const dataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;
  const caption = typeof formData.get("caption") === "string" ? (formData.get("caption") as string).trim() : "";

  MONTAGE_PHOTOS.unshift({
    id: `MPH-${randomUUID().slice(0, 8).toUpperCase()}`,
    jobId,
    phase: phaseParsed.data,
    dataUrl,
    caption: caption || null,
    uploadedBy: user.name,
    uploadedAt: new Date().toISOString(),
  });

  logHistory(job, `Photo « ${phaseParsed.data} » ajoutée`, user.name);
  revalidateJob(jobId, project.id);
  return { ok: true, data: undefined };
}

// --- Client signature & reception --------------------------------------------------

const signatureSchema = z.object({
  signedBy: z.string().trim().min(2, "Le nom du client est requis."),
  signatureDataUrl: z.string().trim().min(1, "La signature est requise."),
});

/**
 * Records the client's signature — the final-approval moment for a montage
 * job. Completes the job and unlocks Réception on the project, the same
 * auto-advance contract used by production and vernissage.
 */
export async function recordClientSignature(jobId: string, input: unknown): Promise<ActionResult> {
  const result = await requireJobAccess(jobId);
  if (!result.ok) return result;
  const { job, project, user } = result;

  const parsed = signatureSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  if (!parsed.data.signatureDataUrl.startsWith("data:image/")) {
    return { ok: false, error: "Signature invalide." };
  }

  job.signedBy = parsed.data.signedBy;
  job.signatureDataUrl = parsed.data.signatureDataUrl;
  job.signedAt = new Date().toISOString();
  job.stage = "Terminé";
  job.progress = MONTAGE_STAGE_PROGRESS.Terminé;
  job.updatedAt = job.signedAt;

  syncProjectFromMontage(project, job);
  logHistory(job, `Réception signée par ${parsed.data.signedBy}`, user.name);

  revalidateJob(jobId, project.id);
  return { ok: true, data: undefined };
}
