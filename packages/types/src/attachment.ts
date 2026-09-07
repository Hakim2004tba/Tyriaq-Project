/**
 * Attachment domain types (Phase 07). Mirrors supabase/migrations'
 * attachments table. File bytes live in Supabase Storage; this is the
 * metadata record — see supabase/migrations/README.md for the storage
 * path convention and security model.
 */
import type { CommentAuthor } from "./comment";

/** Mirrors the `attachments` table. */
export interface Attachment {
  id: string;
  workspaceId: string;
  uploadedBy: string;
  taskId: string | null;
  documentId: string | null;
  storagePath: string;
  fileName: string;
  mimeType: string | null;
  fileSize: number | null;
  createdAt: string;
  deletedAt: string | null;
}

/** An attachment joined with its uploader's display info. */
export interface AttachmentWithUploader extends Attachment {
  uploader: CommentAuthor;
}

/** Exactly one of taskId/documentId — same pattern as CommentTarget. */
export type AttachmentTarget = { taskId: string; documentId?: undefined } | { taskId?: undefined; documentId: string };

/** Broad file-category classification, used to pick an icon/preview
 * treatment — not stored, derived client-side from mimeType. */
export type FileCategory = "image" | "pdf" | "document" | "spreadsheet" | "presentation" | "other";

export function getFileCategory(mimeType: string | null): FileCategory {
  if (!mimeType) return "other";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.includes("spreadsheet") || mimeType === "text/csv") return "spreadsheet";
  if (mimeType.includes("presentation")) return "presentation";
  if (mimeType.includes("word") || mimeType.includes("document") || mimeType === "text/plain") return "document";
  return "other";
}
