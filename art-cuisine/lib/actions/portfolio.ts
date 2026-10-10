"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/session";
import {
  PORTFOLIO_PROJECTS,
  PORTFOLIO_CATEGORIES,
  PORTFOLIO_STATUSES,
  type PortfolioProjectRecord,
} from "@/lib/data/operations";
import { getPortfolioProjectById, isSlugTaken } from "@/lib/data/portfolio";

type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_IMAGES_PER_PROJECT = 24;

const DIACRITICS = /[\u0300-\u036f]/g;

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function uniqueSlug(base: string, excludeId?: string): string {
  const root = slugify(base) || "projet";
  let candidate = root;
  let n = 2;
  while (isSlugTaken(candidate, excludeId)) {
    candidate = `${root}-${n}`;
    n += 1;
  }
  return candidate;
}

function splitTags(value: string): string[] {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function splitParagraphs(value: string): string[] {
  return value
    .split(/\n+/)
    .map((v) => v.trim())
    .filter(Boolean);
}

function normalizeSourceRef(value: string | null | undefined): string | null {
  return value && value !== "none" ? value : null;
}

function revalidatePortfolio(id?: string): void {
  revalidatePath("/dashboard/portefeuille");
  if (id) revalidatePath(`/dashboard/portefeuille/${id}`);
  revalidatePath("/realisations");
}

const portfolioSchema = z.object({
  title: z.string().trim().min(2, "Le titre est requis."),
  category: z.enum(PORTFOLIO_CATEGORIES),
  layout: z.string().trim().min(2, "La configuration (ex : Cuisine en L) est requise."),
  location: z.string().trim().min(2, "La ville est requise."),
  year: z.coerce.number().min(2000).max(2100),
  surface: z.string().trim().min(1, "La surface est requise."),
  summary: z.string().trim().min(2, "Le résumé est requis."),
  description: z.string().trim().optional().default(""),
  materials: z.string().trim().optional().default(""),
  finishes: z.string().trim().optional().default(""),
  sourceProjectRef: z.string().trim().optional().nullable(),
});

export async function createPortfolioProject(input: unknown): Promise<ActionResult<{ id: string }>> {
  await requirePermission("portefeuille.manage");

  const parsed = portfolioSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const id = `PF-${randomUUID().slice(0, 8).toUpperCase()}`;
  const now = new Date().toISOString();
  const maxOrder = PORTFOLIO_PROJECTS.reduce((max, p) => Math.max(max, p.order), -1);

  const project: PortfolioProjectRecord = {
    id,
    slug: uniqueSlug(parsed.data.title),
    title: parsed.data.title,
    category: parsed.data.category,
    layout: parsed.data.layout,
    location: parsed.data.location,
    year: parsed.data.year,
    surface: parsed.data.surface,
    summary: parsed.data.summary,
    description: splitParagraphs(parsed.data.description ?? ""),
    materials: splitTags(parsed.data.materials ?? ""),
    finishes: splitTags(parsed.data.finishes ?? ""),
    images: [],
    status: "Brouillon",
    featured: false,
    order: maxOrder + 1,
    sourceProjectRef: normalizeSourceRef(parsed.data.sourceProjectRef),
    createdAt: now,
    updatedAt: now,
  };
  PORTFOLIO_PROJECTS.unshift(project);

  revalidatePortfolio();
  return { ok: true, data: { id } };
}

export async function updatePortfolioProject(id: string, input: unknown): Promise<ActionResult> {
  await requirePermission("portefeuille.manage");

  const project = getPortfolioProjectById(id);
  if (!project) return { ok: false, error: "Réalisation introuvable." };

  const parsed = portfolioSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  if (parsed.data.title !== project.title) {
    project.slug = uniqueSlug(parsed.data.title, project.id);
  }
  project.title = parsed.data.title;
  project.category = parsed.data.category;
  project.layout = parsed.data.layout;
  project.location = parsed.data.location;
  project.year = parsed.data.year;
  project.surface = parsed.data.surface;
  project.summary = parsed.data.summary;
  project.description = splitParagraphs(parsed.data.description ?? "");
  project.materials = splitTags(parsed.data.materials ?? "");
  project.finishes = splitTags(parsed.data.finishes ?? "");
  project.sourceProjectRef = normalizeSourceRef(parsed.data.sourceProjectRef);
  project.updatedAt = new Date().toISOString();

  revalidatePortfolio(id);
  return { ok: true, data: undefined };
}

const statusSchema = z.object({ status: z.enum(PORTFOLIO_STATUSES) });

export async function setPortfolioProjectStatus(id: string, status: unknown): Promise<ActionResult> {
  await requirePermission("portefeuille.manage");

  const project = getPortfolioProjectById(id);
  if (!project) return { ok: false, error: "Réalisation introuvable." };

  const parsed = statusSchema.safeParse({ status });
  if (!parsed.success) {
    return { ok: false, error: "Statut invalide." };
  }
  if (parsed.data.status === "Publié" && project.images.length === 0) {
    return { ok: false, error: "Ajoutez au moins une image avant de publier cette réalisation." };
  }

  project.status = parsed.data.status;
  project.updatedAt = new Date().toISOString();

  revalidatePortfolio(id);
  return { ok: true, data: undefined };
}

export async function toggleFeaturedPortfolioProject(id: string): Promise<ActionResult> {
  await requirePermission("portefeuille.manage");

  const project = getPortfolioProjectById(id);
  if (!project) return { ok: false, error: "Réalisation introuvable." };

  project.featured = !project.featured;
  project.updatedAt = new Date().toISOString();

  revalidatePortfolio(id);
  return { ok: true, data: undefined };
}

export async function reorderPortfolioProject(id: string, direction: "haut" | "bas"): Promise<ActionResult> {
  await requirePermission("portefeuille.manage");

  const ordered = [...PORTFOLIO_PROJECTS].sort((a, b) => a.order - b.order);
  const index = ordered.findIndex((p) => p.id === id);
  if (index === -1) return { ok: false, error: "Réalisation introuvable." };

  const swapIndex = direction === "haut" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= ordered.length) {
    return { ok: true, data: undefined };
  }

  const a = ordered[index];
  const b = ordered[swapIndex];
  const aOrder = a.order;
  a.order = b.order;
  b.order = aOrder;

  revalidatePortfolio();
  return { ok: true, data: undefined };
}

/** Soft-delete: archived entries drop off the public site and the default admin list, but stay recoverable. */
export async function archivePortfolioProject(id: string): Promise<ActionResult> {
  await requirePermission("portefeuille.manage");

  const project = getPortfolioProjectById(id);
  if (!project) return { ok: false, error: "Réalisation introuvable." };

  project.status = "Archivé";
  project.updatedAt = new Date().toISOString();

  revalidatePortfolio(id);
  return { ok: true, data: undefined };
}

export async function restorePortfolioProject(id: string): Promise<ActionResult> {
  await requirePermission("portefeuille.manage");

  const project = getPortfolioProjectById(id);
  if (!project) return { ok: false, error: "Réalisation introuvable." };

  project.status = "Brouillon";
  project.updatedAt = new Date().toISOString();

  revalidatePortfolio(id);
  return { ok: true, data: undefined };
}

// --- Images ------------------------------------------------------------------

export async function uploadPortfolioImages(id: string, formData: FormData): Promise<ActionResult> {
  await requirePermission("portefeuille.manage");

  const project = getPortfolioProjectById(id);
  if (!project) return { ok: false, error: "Réalisation introuvable." };

  const files = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) {
    return { ok: false, error: "Merci de sélectionner au moins une image." };
  }
  if (project.images.length + files.length > MAX_IMAGES_PER_PROJECT) {
    return { ok: false, error: `Cette réalisation ne peut pas dépasser ${MAX_IMAGES_PER_PROJECT} images.` };
  }
  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) {
      return { ok: false, error: `« ${file.name} » dépasse la taille maximale autorisée (8 Mo).` };
    }
    if (!file.type.startsWith("image/")) {
      return { ok: false, error: `« ${file.name} » n'est pas une image.` };
    }
  }

  let nextOrder = project.images.reduce((max, img) => Math.max(max, img.order), -1) + 1;
  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const dataUrl = `data:${file.type};base64,${buffer.toString("base64")}`;
    project.images.push({
      id: `PFI-${randomUUID().slice(0, 8).toUpperCase()}`,
      dataUrl,
      caption: null,
      order: nextOrder,
    });
    nextOrder += 1;
  }
  project.updatedAt = new Date().toISOString();

  revalidatePortfolio(id);
  return { ok: true, data: undefined };
}

export async function deletePortfolioImage(id: string, imageId: string): Promise<ActionResult> {
  await requirePermission("portefeuille.manage");

  const project = getPortfolioProjectById(id);
  if (!project) return { ok: false, error: "Réalisation introuvable." };

  project.images = project.images.filter((img) => img.id !== imageId);
  project.updatedAt = new Date().toISOString();

  revalidatePortfolio(id);
  return { ok: true, data: undefined };
}

/** Moves an image to the front — it becomes the cover shown on the listing. */
export async function setPortfolioCoverImage(id: string, imageId: string): Promise<ActionResult> {
  await requirePermission("portefeuille.manage");

  const project = getPortfolioProjectById(id);
  if (!project) return { ok: false, error: "Réalisation introuvable." };

  const image = project.images.find((img) => img.id === imageId);
  if (!image) return { ok: false, error: "Image introuvable." };

  const minOrder = Math.min(...project.images.map((img) => img.order)) - 1;
  image.order = minOrder;
  project.images.sort((a, b) => a.order - b.order).forEach((img, i) => { img.order = i; });
  project.updatedAt = new Date().toISOString();

  revalidatePortfolio(id);
  return { ok: true, data: undefined };
}
