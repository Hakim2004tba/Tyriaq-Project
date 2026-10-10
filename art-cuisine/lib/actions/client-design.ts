"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/session";
import { ACTIVITY, type ProjectRecord } from "@/lib/data/operations";
import { getProjectById } from "@/lib/data/project-records";
import { isDesignAwaitingClient } from "@/lib/data/design";
import { getClientByEmail } from "@/lib/data/clients";
import { notifyByName, notifyAdmins } from "@/lib/notify";

type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

type OwnProjectResult = { ok: false; error: string } | { ok: true; project: ProjectRecord; actorName: string };

/** Verifies the signed-in client-role user owns this project and its design is awaiting a decision. */
async function requireOwnProjectDesign(projectId: string): Promise<OwnProjectResult> {
  const user = await requirePermission("projects.view_own");
  const client = await getClientByEmail(user.email);
  if (!client) {
    return { ok: false, error: "Aucun compte client associé à cette adresse e-mail." };
  }

  const project = getProjectById(projectId);
  if (!project) {
    return { ok: false, error: "Projet introuvable." };
  }
  if (project.clientId !== client.id) {
    return { ok: false, error: "Ce projet ne vous appartient pas." };
  }
  if (!isDesignAwaitingClient(project.designStatus)) {
    return { ok: false, error: "Ce design n'est pas en attente de votre validation." };
  }

  return { ok: true, project, actorName: user.name };
}

function revalidateAfterDecision(projectId: string): void {
  revalidatePath("/dashboard/mes-projets");
  revalidatePath("/dashboard/conception");
  revalidatePath("/dashboard/projets");
  revalidatePath(`/dashboard/projets/${projectId}`);
}

export async function clientValidateDesign(projectId: string): Promise<ActionResult> {
  const result = await requireOwnProjectDesign(projectId);
  if (!result.ok) return result;
  const { project, actorName } = result;

  project.designStatus = "Validé";
  project.designClientNote = null;
  project.designValidatedAt = new Date().toISOString();

  ACTIVITY.unshift({
    id: `A-${randomUUID().slice(0, 6).toUpperCase()}`,
    category: "projet",
    message: `Design du projet ${project.ref} validé par le client`,
    actor: actorName,
    timestamp: new Date().toISOString(),
    clientName: project.clientName,
  });

  notifyByName(project.designer, { type: "design_approved", title: "Design validé", description: `${project.ref} — ${project.name}`, link: `/dashboard/projets/${projectId}` });
  notifyAdmins({ type: "design_approved", title: "Design validé", description: `${project.ref} — ${project.name}`, link: `/dashboard/projets/${projectId}` });

  revalidateAfterDecision(projectId);
  return { ok: true, data: undefined };
}

const noteSchema = z.object({ note: z.string().trim().min(5, "Merci de préciser votre demande (5 caractères minimum).") });

export async function clientRequestDesignRevision(projectId: string, input: unknown): Promise<ActionResult> {
  const result = await requireOwnProjectDesign(projectId);
  if (!result.ok) return result;
  const { project, actorName } = result;

  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  project.designStatus = "Modification demandée";
  project.designClientNote = parsed.data.note;

  ACTIVITY.unshift({
    id: `A-${randomUUID().slice(0, 6).toUpperCase()}`,
    category: "projet",
    message: `Modification demandée par le client sur le design du projet ${project.ref}`,
    actor: actorName,
    timestamp: new Date().toISOString(),
    clientName: project.clientName,
  });

  notifyByName(project.designer, { type: "design_revision_requested", title: "Modification demandée", description: `${project.ref} — ${parsed.data.note}`, link: `/dashboard/projets/${projectId}` });
  notifyAdmins({ type: "design_revision_requested", title: "Modification demandée", description: `${project.ref} — ${parsed.data.note}`, link: `/dashboard/projets/${projectId}` });

  revalidateAfterDecision(projectId);
  return { ok: true, data: undefined };
}
