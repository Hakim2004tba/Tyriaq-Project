"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission, requireAnyPermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import type { Role } from "@/lib/auth/roles";
import {
  DOCUMENTS,
  DOCUMENT_VERSIONS,
  DOCUMENT_SHARES,
  DOCUMENT_EVENTS,
  DOCUMENT_CATEGORIES,
  type DocumentRecord,
} from "@/lib/data/operations";
import { getDocumentById, getDocumentShares, isShareUsable } from "@/lib/data/documents";
import { getClientById, getClientByEmail, getClientCommercialMap } from "@/lib/data/clients";
import { getOwnerScope } from "@/lib/data/scope";

type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const MAX_FILE_BYTES = 8 * 1024 * 1024;

function formatSizeLabel(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

async function readFile(file: File): Promise<{ dataUrl: string; sizeLabel: string; mimeType: string; fileName: string } | { error: string }> {
  if (file.size > MAX_FILE_BYTES) {
    return { error: "Le fichier dépasse la taille maximale autorisée (8 Mo)." };
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || "application/octet-stream";
  return {
    dataUrl: `data:${mimeType};base64,${buffer.toString("base64")}`,
    sizeLabel: formatSizeLabel(file.size),
    mimeType,
    fileName: file.name,
  };
}

function canManageDocument(scope: string | null, doc: Pick<DocumentRecord, "clientId">, commercialByClient: Map<string, string>): boolean {
  if (!scope) return true;
  if (!doc.clientId) return true;
  return commercialByClient.get(doc.clientId) === scope;
}

function logEvent(documentId: string, action: (typeof DOCUMENT_EVENTS)[number]["action"], actor: string, detail: string | null = null): void {
  DOCUMENT_EVENTS.unshift({
    id: `DOCEVT-${randomUUID().slice(0, 8).toUpperCase()}`,
    documentId,
    action,
    actor,
    timestamp: new Date().toISOString(),
    detail,
  });
}

function revalidateDocument(id: string): void {
  revalidatePath("/dashboard/documents");
  revalidatePath(`/dashboard/documents/${id}`);
  revalidatePath("/dashboard/mes-documents");
}

const metaSchema = z.object({
  name: z.string().trim().min(2, "Le nom du document est requis."),
  category: z.enum(DOCUMENT_CATEGORIES),
  clientId: z.string().trim().optional().nullable(),
  devisId: z.string().trim().optional().nullable(),
  projectRef: z.string().trim().optional().nullable(),
});

function normalize(value: string | null | undefined): string | null {
  return value && value !== "none" ? value : null;
}

/** Uploads a brand-new document, linked to a Client, Devis and/or Project. */
export async function uploadDocument(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requirePermission("documents.manage");
  const scope = getOwnerScope(user);

  const parsed = metaSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    clientId: formData.get("clientId"),
    devisId: formData.get("devisId"),
    projectRef: formData.get("projectRef"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const clientId = normalize(parsed.data.clientId);
  const client = clientId ? await getClientById(clientId) : undefined;
  if (clientId && !client) {
    return { ok: false, error: "Client introuvable." };
  }
  if (scope && client && client.commercial !== scope) {
    return { ok: false, error: "Vous n'avez pas accès à ce client." };
  }

  const file = formData.get("file");
  let fileInfo: { dataUrl: string; sizeLabel: string; mimeType: string; fileName: string } | null = null;
  if (file instanceof File && file.size > 0) {
    const result = await readFile(file);
    if ("error" in result) return { ok: false, error: result.error };
    fileInfo = result;
  }

  const id = `DOC-${randomUUID().slice(0, 8).toUpperCase()}`;
  const now = new Date().toISOString();

  DOCUMENTS.unshift({
    id,
    name: parsed.data.name,
    category: parsed.data.category,
    clientId,
    clientName: client?.name ?? "—",
    devisId: normalize(parsed.data.devisId),
    projectRef: normalize(parsed.data.projectRef),
    version: 1,
    fileName: fileInfo?.fileName ?? null,
    mimeType: fileInfo?.mimeType ?? null,
    sizeLabel: fileInfo?.sizeLabel ?? "—",
    dataUrl: fileInfo?.dataUrl ?? null,
    uploadedBy: user.name,
    createdAt: now,
    updatedAt: now,
  });

  logEvent(id, "upload", user.name);
  revalidateDocument(id);
  return { ok: true, data: { id } };
}

/** Uploads a new version of an existing document — the previous file is preserved in DOCUMENT_VERSIONS. */
export async function uploadDocumentVersion(documentId: string, formData: FormData): Promise<ActionResult> {
  const user = await requirePermission("documents.manage");
  const scope = getOwnerScope(user);
  const commercialByClient = await getClientCommercialMap();

  const doc = getDocumentById(documentId);
  if (!doc) return { ok: false, error: "Document introuvable." };
  if (!canManageDocument(scope, doc, commercialByClient)) {
    return { ok: false, error: "Vous n'avez pas accès à ce document." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Merci de sélectionner un fichier." };
  }
  const result = await readFile(file);
  if ("error" in result) return { ok: false, error: result.error };

  const note = typeof formData.get("note") === "string" ? (formData.get("note") as string).trim() : "";

  DOCUMENT_VERSIONS.unshift({
    id: `DOCV-${randomUUID().slice(0, 8).toUpperCase()}`,
    documentId: doc.id,
    version: doc.version,
    fileName: doc.fileName,
    mimeType: doc.mimeType,
    sizeLabel: doc.sizeLabel,
    dataUrl: doc.dataUrl,
    uploadedBy: doc.uploadedBy,
    uploadedAt: doc.updatedAt,
    note: note || null,
  });

  doc.fileName = result.fileName;
  doc.mimeType = result.mimeType;
  doc.sizeLabel = result.sizeLabel;
  doc.dataUrl = result.dataUrl;
  doc.version += 1;
  doc.uploadedBy = user.name;
  doc.updatedAt = new Date().toISOString();

  logEvent(doc.id, "new_version", user.name, note || null);
  revalidateDocument(doc.id);
  return { ok: true, data: undefined };
}

const shareSchema = z.object({
  expiresInDays: z.coerce.number().min(0).max(365).optional(),
});

/** Creates a public, token-based share link for a document. */
export async function createDocumentShare(documentId: string, input: unknown): Promise<ActionResult<{ token: string }>> {
  const user = await requirePermission("documents.manage");
  const scope = getOwnerScope(user);
  const commercialByClient = await getClientCommercialMap();

  const doc = getDocumentById(documentId);
  if (!doc) return { ok: false, error: "Document introuvable." };
  if (!canManageDocument(scope, doc, commercialByClient)) {
    return { ok: false, error: "Vous n'avez pas accès à ce document." };
  }
  if (!doc.dataUrl) {
    return { ok: false, error: "Ce document n'a pas de fichier à partager." };
  }

  const parsed = shareSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Durée de validité invalide." };
  }

  const token = randomUUID().replace(/-/g, "");
  const expiresAt = parsed.data.expiresInDays
    ? new Date(Date.now() + parsed.data.expiresInDays * 86_400_000).toISOString()
    : null;

  DOCUMENT_SHARES.unshift({
    id: `DSH-${randomUUID().slice(0, 8).toUpperCase()}`,
    documentId: doc.id,
    token,
    createdBy: user.name,
    createdAt: new Date().toISOString(),
    expiresAt,
    revoked: false,
  });

  logEvent(doc.id, "share", user.name, expiresAt ? `Lien valide ${parsed.data.expiresInDays} jours.` : "Lien sans expiration.");
  revalidateDocument(doc.id);
  return { ok: true, data: { token } };
}

export async function revokeDocumentShare(shareId: string): Promise<ActionResult> {
  const user = await requirePermission("documents.manage");
  const scope = getOwnerScope(user);
  const commercialByClient = await getClientCommercialMap();

  const share = DOCUMENT_SHARES.find((s) => s.id === shareId);
  if (!share) return { ok: false, error: "Lien introuvable." };

  const doc = getDocumentById(share.documentId);
  if (doc && !canManageDocument(scope, doc, commercialByClient)) {
    return { ok: false, error: "Vous n'avez pas accès à ce document." };
  }

  share.revoked = true;
  if (doc) {
    logEvent(doc.id, "revoke_share", user.name);
    revalidateDocument(doc.id);
  }
  return { ok: true, data: undefined };
}

/**
 * Lightweight logging for view/download actions, callable by staff (any
 * document they manage) or a client viewing their own document.
 */
export async function recordDocumentEvent(documentId: string, action: "view" | "download"): Promise<ActionResult> {
  const user = await requireAnyPermission(["documents.manage", "documents.view_own"]);
  const doc = getDocumentById(documentId);
  if (!doc) return { ok: false, error: "Document introuvable." };

  if (!hasPermission(user.role as Role, "documents.manage")) {
    const client = await getClientByEmail(user.email);
    if (!client || doc.clientId !== client.id) {
      return { ok: false, error: "Vous n'avez pas accès à ce document." };
    }
  }

  logEvent(doc.id, action, user.name);
  revalidatePath(`/dashboard/documents/${doc.id}`);
  return { ok: true, data: undefined };
}

export { getDocumentShares, isShareUsable };
