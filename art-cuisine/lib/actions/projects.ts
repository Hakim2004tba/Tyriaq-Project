"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { requirePermission } from "@/lib/auth/session";
import { getPgDb } from "@/lib/db/pg";
import { devis as devisTable } from "@/lib/db/schema";
import {
  PROJECTS,
  PROJECT_STAGES,
  PROJECT_PRIORITIES,
  PROJECT_ISSUES,
  TASKS,
  ACTIVITY,
  CATALOGUE_ITEMS,
  type TaskStatus,
  type ProjectIssueStatus,
} from "@/lib/data/operations";
import { getDevisById } from "@/lib/data/devis";
import { getProjectById, nextProjectRef, STAGE_PROGRESS, COMMERCIALS, DESIGNERS, PRODUCTION_LEADS, VERNISSEURS, MONTAGE_LEADS } from "@/lib/data/project-records";
import { getOwnerScope } from "@/lib/data/scope";
import { notifyAdmins } from "@/lib/notify";

type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

function canManage(scope: string | null, commercial: string | null): boolean {
  return !scope || commercial === null || commercial === scope;
}

function normalize(value: string | null | undefined): string | null {
  return value && value !== "none" ? value : null;
}

/**
 * Converts an accepted devis into a project — the one and only way a
 * project is created, matching "every accepted devis can become a project."
 */
export async function convertDevisToProject(devisId: string): Promise<ActionResult<{ id: string }>> {
  const user = await requirePermission("devis.manage");
  const scope = getOwnerScope(user);

  const devis = await getDevisById(devisId);
  if (!devis) {
    return { ok: false, error: "Devis introuvable." };
  }
  if (!canManage(scope, devis.commercial)) {
    return { ok: false, error: "Vous n'avez pas accès à ce devis." };
  }
  if (devis.status !== "Accepté") {
    return { ok: false, error: "Seul un devis accepté peut devenir un projet." };
  }
  if (devis.projectRef) {
    return { ok: false, error: "Ce devis est déjà lié à un projet." };
  }

  const id = `P-${randomUUID().slice(0, 8).toUpperCase()}`;
  const ref = nextProjectRef();
  const startDate = new Date().toISOString();
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 45);

  PROJECTS.unshift({
    id,
    ref,
    name: devis.projectLabel,
    clientId: devis.clientId,
    clientName: devis.clientName,
    devisId: devis.id,
    commercial: devis.commercial,
    designer: null,
    productionLead: null,
    vernisseur: null,
    montageLead: null,
    stage: "Conception",
    priority: "Normale",
    amount: devis.amount,
    progress: STAGE_PROGRESS.Conception,
    startDate,
    dueDate: dueDate.toISOString(),
    completedAt: null,
    designStatus: "Brouillon",
    measurements: null,
    designerNotes: "",
    designClientNote: null,
    designValidatedAt: null,
    materialSelections: [],
  });

  await getPgDb().update(devisTable).set({ projectRef: ref }).where(eq(devisTable.id, devisId));

  ACTIVITY.unshift({
    id: `A-${randomUUID().slice(0, 6).toUpperCase()}`,
    category: "projet",
    message: `Projet ${ref} créé à partir du devis ${devis.ref}`,
    actor: user.name,
    timestamp: new Date().toISOString(),
    clientName: devis.clientName,
  });

  revalidatePath("/dashboard/projets");
  revalidatePath("/dashboard/devis");
  revalidatePath(`/dashboard/devis/${devisId}`);
  return { ok: true, data: { id } };
}

async function requireManageableProject(projectId: string) {
  const user = await requirePermission("projects.manage");
  const scope = getOwnerScope(user);
  const project = getProjectById(projectId);
  if (!project) return { ok: false as const, error: "Projet introuvable." };
  if (!canManage(scope, project.commercial)) return { ok: false as const, error: "Vous n'avez pas accès à ce projet." };
  return { ok: true as const, project, user };
}

function revalidateProject(id: string): void {
  revalidatePath("/dashboard/projets");
  revalidatePath(`/dashboard/projets/${id}`);
}

const projectSchema = z.object({
  name: z.string().trim().min(2, "Le nom du projet est requis."),
  commercial: z.enum(COMMERCIALS).nullable().optional(),
  designer: z.string().trim().optional().nullable(),
  productionLead: z.string().trim().optional().nullable(),
  vernisseur: z.string().trim().optional().nullable(),
  montageLead: z.string().trim().optional().nullable(),
  priority: z.enum(PROJECT_PRIORITIES),
  amount: z.coerce.number().min(0, "Le budget doit être positif."),
  dueDate: z.string().trim().min(1, "L'échéance est requise."),
  progress: z.coerce.number().min(0).max(100),
});

export async function updateProject(id: string, input: unknown): Promise<ActionResult> {
  const result = await requireManageableProject(id);
  if (!result.ok) return result;
  const { project } = result;

  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const designer = normalize(parsed.data.designer);
  const productionLead = normalize(parsed.data.productionLead);
  const vernisseur = normalize(parsed.data.vernisseur);
  const montageLead = normalize(parsed.data.montageLead);

  project.name = parsed.data.name;
  project.designer = designer && (DESIGNERS as readonly string[]).includes(designer) ? designer : null;
  project.productionLead = productionLead && (PRODUCTION_LEADS as readonly string[]).includes(productionLead) ? productionLead : null;
  project.vernisseur = vernisseur && (VERNISSEURS as readonly string[]).includes(vernisseur) ? vernisseur : null;
  project.montageLead = montageLead && (MONTAGE_LEADS as readonly string[]).includes(montageLead) ? montageLead : null;
  project.priority = parsed.data.priority;
  project.amount = parsed.data.amount;
  project.dueDate = new Date(parsed.data.dueDate).toISOString();
  project.progress = parsed.data.progress;
  if (parsed.data.commercial) project.commercial = parsed.data.commercial;

  revalidateProject(id);
  return { ok: true, data: undefined };
}

const stageSchema = z.object({ stage: z.enum(PROJECT_STAGES) });

export async function updateProjectStage(id: string, stage: unknown): Promise<ActionResult> {
  const result = await requireManageableProject(id);
  if (!result.ok) return result;
  const { project, user } = result;

  const parsed = stageSchema.safeParse({ stage });
  if (!parsed.success) {
    return { ok: false, error: "Étape invalide." };
  }

  const productionIndex = PROJECT_STAGES.indexOf("Production");
  const targetIndex = PROJECT_STAGES.indexOf(parsed.data.stage);
  if (targetIndex >= productionIndex && project.designStatus !== "Validé") {
    return { ok: false, error: "Le design doit être validé par le client avant de passer en production." };
  }

  project.stage = parsed.data.stage;
  project.progress = Math.max(project.progress, STAGE_PROGRESS[parsed.data.stage]);
  project.completedAt = parsed.data.stage === "Terminé" ? new Date().toISOString() : null;

  ACTIVITY.unshift({
    id: `A-${randomUUID().slice(0, 6).toUpperCase()}`,
    category: "projet",
    message: `Projet ${project.ref} passé en ${parsed.data.stage}`,
    actor: user.name,
    timestamp: new Date().toISOString(),
    clientName: project.clientName,
  });

  revalidateProject(id);
  return { ok: true, data: undefined };
}

// --- Materials & finishes ----------------------------------------------------

const materialsSchema = z.object({ itemIds: z.array(z.string()).default([]) });

/** Lets a project record which catalogue materials/finishes were chosen for it — makes the catalogue "selectable inside Projects". */
export async function updateProjectMaterials(projectId: string, input: unknown): Promise<ActionResult> {
  const result = await requireManageableProject(projectId);
  if (!result.ok) return result;
  const { project } = result;

  const parsed = materialsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const validIds = new Set(CATALOGUE_ITEMS.map((i) => i.id));
  project.materialSelections = parsed.data.itemIds.filter((id) => validIds.has(id));

  revalidateProject(projectId);
  return { ok: true, data: undefined };
}

// --- Tasks -----------------------------------------------------------------

const taskSchema = z.object({
  title: z.string().trim().min(2, "Le titre est requis."),
  role: z.string().trim().min(2, "Le rôle est requis."),
  dueDate: z.string().trim().min(1, "L'échéance est requise."),
  priority: z.enum(["Basse", "Normale", "Haute"]),
});

export async function createProjectTask(projectRef: string, projectId: string, input: unknown): Promise<ActionResult> {
  const result = await requireManageableProject(projectId);
  if (!result.ok) return result;

  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  TASKS.unshift({
    id: `T-${randomUUID().slice(0, 8).toUpperCase()}`,
    title: parsed.data.title,
    role: parsed.data.role,
    relatedRef: projectRef,
    dueDate: new Date(parsed.data.dueDate).toISOString(),
    status: "À faire",
    priority: parsed.data.priority,
  });

  notifyAdmins({ type: "task_assigned", title: "Nouvelle tâche", description: `${parsed.data.title} — ${parsed.data.role}`, link: `/dashboard/projets/${projectId}` });

  revalidateProject(projectId);
  return { ok: true, data: undefined };
}

const taskStatusSchema = z.object({ status: z.enum(["À faire", "En cours", "Terminée"]) });

export async function updateTaskStatus(taskId: string, projectId: string, status: unknown): Promise<ActionResult> {
  const result = await requireManageableProject(projectId);
  if (!result.ok) return result;

  const parsed = taskStatusSchema.safeParse({ status });
  if (!parsed.success) {
    return { ok: false, error: "Statut invalide." };
  }

  const task = TASKS.find((t) => t.id === taskId);
  if (!task) return { ok: false, error: "Tâche introuvable." };

  task.status = parsed.data.status as TaskStatus;
  revalidateProject(projectId);
  return { ok: true, data: undefined };
}

// --- Issues ------------------------------------------------------------------

const issueSchema = z.object({
  title: z.string().trim().min(2, "Le titre est requis."),
  description: z.string().trim().min(2, "La description est requise."),
  severity: z.enum(["Basse", "Normale", "Haute", "Critique"]),
});

export async function reportProjectIssue(projectRef: string, projectId: string, input: unknown): Promise<ActionResult> {
  const result = await requireManageableProject(projectId);
  if (!result.ok) return result;
  const { user } = result;

  const parsed = issueSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  PROJECT_ISSUES.unshift({
    id: `ISS-${randomUUID().slice(0, 8).toUpperCase()}`,
    projectRef,
    title: parsed.data.title,
    description: parsed.data.description,
    severity: parsed.data.severity,
    status: "Ouvert",
    reportedBy: user.name,
    createdAt: new Date().toISOString(),
    resolvedAt: null,
  });

  revalidateProject(projectId);
  return { ok: true, data: undefined };
}

const issueStatusSchema = z.object({ status: z.enum(["Ouvert", "En cours", "Résolu"]) });

export async function updateIssueStatus(issueId: string, projectId: string, status: unknown): Promise<ActionResult> {
  const result = await requireManageableProject(projectId);
  if (!result.ok) return result;

  const parsed = issueStatusSchema.safeParse({ status });
  if (!parsed.success) {
    return { ok: false, error: "Statut invalide." };
  }

  const issue = PROJECT_ISSUES.find((i) => i.id === issueId);
  if (!issue) return { ok: false, error: "Problème introuvable." };

  issue.status = parsed.data.status as ProjectIssueStatus;
  issue.resolvedAt = parsed.data.status === "Résolu" ? new Date().toISOString() : null;

  revalidateProject(projectId);
  return { ok: true, data: undefined };
}
