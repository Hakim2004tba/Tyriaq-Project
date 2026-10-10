"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/session";
import {
  DESIGN_VERSIONS,
  DESIGN_VERSION_KINDS,
  KITCHEN_LAYOUTS,
  ACTIVITY,
  MESSAGES,
  type DesignVersionRecord,
} from "@/lib/data/operations";
import { getProjectById } from "@/lib/data/project-records";
import { getDesignVersionById } from "@/lib/data/design";
import { generateFloorPlanSvg, generateRenderSvg, type KitchenVisualParams } from "@/lib/design/kitchen-svg";
import { getOwnerScope } from "@/lib/data/scope";

type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

function canManage(scope: string | null, commercial: string | null): boolean {
  return !scope || commercial === null || commercial === scope;
}

async function requireDesignAccess(projectId: string) {
  const user = await requirePermission("conception.manage");
  const scope = getOwnerScope(user);
  const project = getProjectById(projectId);
  if (!project) return { ok: false as const, error: "Projet introuvable." };
  if (!canManage(scope, project.commercial)) return { ok: false as const, error: "Vous n'avez pas accès à ce projet." };
  return { ok: true as const, project, user };
}

function revalidateProject(id: string): void {
  revalidatePath("/dashboard/conception");
  revalidatePath("/dashboard/projets");
  revalidatePath(`/dashboard/projets/${id}`);
  revalidatePath("/dashboard/mes-projets");
}

function nextVersionNumber(ref: string): number {
  const versions = DESIGN_VERSIONS.filter((v) => v.projectRef === ref);
  return (versions.length > 0 ? Math.max(...versions.map((v) => v.version)) : 0) + 1;
}

const measurementsSchema = z.object({
  width: z.coerce.number().min(0.1, "La largeur doit être positive."),
  depth: z.coerce.number().min(0.1, "La profondeur doit être positive."),
  height: z.coerce.number().min(0.1, "La hauteur doit être positive."),
  notes: z.string().trim().optional().default(""),
});

export async function updateMeasurements(projectId: string, input: unknown): Promise<ActionResult> {
  const result = await requireDesignAccess(projectId);
  if (!result.ok) return result;

  const parsed = measurementsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  result.project.measurements = parsed.data;
  revalidateProject(projectId);
  return { ok: true, data: undefined };
}

const notesSchema = z.object({ notes: z.string().trim().optional().default("") });

export async function updateDesignerNotes(projectId: string, input: unknown): Promise<ActionResult> {
  const result = await requireDesignAccess(projectId);
  if (!result.ok) return result;

  const parsed = notesSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Notes invalides." };
  }

  result.project.designerNotes = parsed.data.notes;
  revalidateProject(projectId);
  return { ok: true, data: undefined };
}

const generateSchema = z.object({
  kind: z.enum(DESIGN_VERSION_KINDS),
  layout: z.enum(KITCHEN_LAYOUTS),
  island: z.union([z.literal("on"), z.literal("true"), z.boolean()]).optional(),
  cabinetColor: z.string().trim().min(1),
  worktopColor: z.string().trim().min(1),
  prompt: z.string().trim().optional().default(""),
});

function toBool(value: unknown): boolean {
  return value === "on" || value === "true" || value === true;
}

/**
 * Generates a new design version from structured specs — a deterministic
 * template generator (see lib/design/kitchen-svg.ts), not a call to an
 * external AI image model. It stands in for one so the workflow is fully
 * usable in this environment, and is labelled as an automatic draft in the UI.
 */
export async function generateDesignVersion(projectId: string, input: unknown): Promise<ActionResult> {
  const result = await requireDesignAccess(projectId);
  if (!result.ok) return result;
  const { project, user } = result;

  const parsed = generateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const params: KitchenVisualParams = {
    layout: parsed.data.layout,
    island: toBool(parsed.data.island),
    width: project.measurements?.width ?? 4,
    depth: project.measurements?.depth ?? 3,
    cabinetColor: parsed.data.cabinetColor,
    worktopColor: parsed.data.worktopColor,
    floorColor: "#e3dccb",
  };

  const imageDataUrl = parsed.data.kind === "Plan" ? generateFloorPlanSvg(params) : generateRenderSvg(params);

  DESIGN_VERSIONS.unshift({
    id: `DSV-${randomUUID().slice(0, 8).toUpperCase()}`,
    projectRef: project.ref,
    version: nextVersionNumber(project.ref),
    kind: parsed.data.kind,
    imageDataUrl,
    source: "generated",
    params,
    prompt: parsed.data.prompt || null,
    note: null,
    createdBy: user.name,
    createdAt: new Date().toISOString(),
  });

  project.designStatus = "Brouillon";
  project.designClientNote = null;

  revalidateProject(projectId);
  return { ok: true, data: undefined };
}

const COLOR_KEYWORDS: Record<string, string> = {
  blanc: "#f2f0ea",
  anthracite: "#33353a",
  noir: "#232323",
  chêne: "#b98a55",
  chene: "#b98a55",
  bois: "#b98a55",
  vert: "#7c8f74",
  sauge: "#7c8f74",
  bleu: "#2b3a55",
  marine: "#2b3a55",
  beige: "#d9c9a8",
  sable: "#d9c9a8",
};

function extractColorFromInstruction(instruction: string): string | null {
  const lower = instruction.toLowerCase();
  for (const [keyword, hex] of Object.entries(COLOR_KEYWORDS)) {
    if (lower.includes(keyword)) return hex;
  }
  return null;
}

const refineSchema = z.object({ instruction: z.string().trim().min(2, "Merci de préciser la modification souhaitée.") });

/**
 * "Refines" an existing generated/refined version — regenerates the same
 * template with a parameter nudged from keywords in the instruction (e.g. a
 * finish color). A stand-in for AI-assisted image editing, same caveat as
 * generateDesignVersion.
 */
export async function refineDesignVersion(projectId: string, versionId: string, input: unknown): Promise<ActionResult> {
  const result = await requireDesignAccess(projectId);
  if (!result.ok) return result;
  const { project, user } = result;

  const base = getDesignVersionById(versionId);
  if (!base || base.projectRef !== project.ref) {
    return { ok: false, error: "Version introuvable." };
  }
  if (!base.params) {
    return { ok: false, error: "Cette version n'a pas été générée — elle ne peut pas être affinée automatiquement." };
  }

  const parsed = refineSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const matchedColor = extractColorFromInstruction(parsed.data.instruction);
  const params: KitchenVisualParams = {
    ...base.params,
    cabinetColor: matchedColor ?? base.params.cabinetColor,
  };
  const imageDataUrl = base.kind === "Plan" ? generateFloorPlanSvg(params) : generateRenderSvg(params);

  DESIGN_VERSIONS.unshift({
    id: `DSV-${randomUUID().slice(0, 8).toUpperCase()}`,
    projectRef: project.ref,
    version: nextVersionNumber(project.ref),
    kind: base.kind,
    imageDataUrl,
    source: "refined",
    params,
    prompt: parsed.data.instruction,
    note: `Affiné à partir de la version ${base.version} : ${parsed.data.instruction}`,
    createdBy: user.name,
    createdAt: new Date().toISOString(),
  });

  project.designStatus = "Brouillon";
  project.designClientNote = null;

  revalidateProject(projectId);
  return { ok: true, data: undefined };
}

const MAX_FILE_BYTES = 8 * 1024 * 1024;

export async function uploadDesignVersion(projectId: string, formData: FormData): Promise<ActionResult> {
  const result = await requireDesignAccess(projectId);
  if (!result.ok) return result;
  const { project, user } = result;

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Merci de sélectionner un fichier." };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, error: "Le fichier dépasse la taille maximale autorisée (8 Mo)." };
  }

  const kindRaw = formData.get("kind");
  const kindParsed = z.enum(DESIGN_VERSION_KINDS).safeParse(kindRaw);
  if (!kindParsed.success) {
    return { ok: false, error: "Type de document invalide." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || "application/octet-stream";
  const imageDataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;
  const note = typeof formData.get("note") === "string" ? (formData.get("note") as string).trim() : "";

  const version: DesignVersionRecord = {
    id: `DSV-${randomUUID().slice(0, 8).toUpperCase()}`,
    projectRef: project.ref,
    version: nextVersionNumber(project.ref),
    kind: kindParsed.data,
    imageDataUrl,
    source: "upload",
    params: null,
    prompt: null,
    note: note || null,
    createdBy: user.name,
    createdAt: new Date().toISOString(),
  };
  DESIGN_VERSIONS.unshift(version);

  project.designStatus = "Brouillon";
  project.designClientNote = null;

  revalidateProject(projectId);
  return { ok: true, data: undefined };
}

export async function sendDesignToClient(projectId: string): Promise<ActionResult> {
  const result = await requireDesignAccess(projectId);
  if (!result.ok) return result;
  const { project, user } = result;

  const latest = DESIGN_VERSIONS.find((v) => v.projectRef === project.ref);
  if (!latest) {
    return { ok: false, error: "Ajoutez au moins une version avant de l'envoyer au client." };
  }

  project.designStatus = "Envoyé au client";

  ACTIVITY.unshift({
    id: `A-${randomUUID().slice(0, 6).toUpperCase()}`,
    category: "projet",
    message: `Design du projet ${project.ref} envoyé au client (v${latest.version})`,
    actor: user.name,
    timestamp: new Date().toISOString(),
    clientName: project.clientName,
  });

  MESSAGES.push({
    id: `MSG-${randomUUID().slice(0, 8)}`,
    clientName: project.clientName,
    sender: "team",
    authorName: user.name,
    content: `Le design de votre cuisine (v${latest.version}) est disponible pour validation dans votre espace client.`,
    timestamp: new Date().toISOString(),
  });

  revalidateProject(projectId);
  return { ok: true, data: undefined };
}
