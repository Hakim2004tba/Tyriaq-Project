/**
 * Document domain types (Phase 06). Mirrors supabase/migrations'
 * documents table — see supabase/migrations/README.md for the
 * visibility/authorization/lifecycle decisions.
 */

export const DOCUMENT_STATUSES = ["active", "archived"] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

/**
 * Structured document content — a Tiptap/ProseMirror JSON document, never
 * raw HTML (see supabase/migrations README for the format rationale).
 * Typed loosely here since the exact node/mark shape is owned by the
 * editor library, not the domain layer; @flow/ui's DocumentEditor is the
 * one place that needs the precise Tiptap types.
 */
export interface DocumentContent {
  type: "doc";
  content?: unknown[];
}

/** Mirrors the `documents` table. */
export interface Document {
  id: string;
  workspaceId: string;
  projectId: string | null;
  parentId: string | null;
  title: string;
  slug: string;
  content: DocumentContent;
  icon: string | null;
  status: DocumentStatus;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

/** Lightweight shape for list views — deliberately excludes `content`
 * (brief section 39: "list queries should retrieve summaries, not full
 * document content"). */
export interface DocumentSummary {
  id: string;
  workspaceId: string;
  projectId: string | null;
  parentId: string | null;
  title: string;
  slug: string;
  icon: string | null;
  status: DocumentStatus;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

/** A document with its direct children resolved — used by the document
 * detail sidebar / breadcrumb navigation. */
export interface DocumentWithChildren extends DocumentSummary {
  children: DocumentSummary[];
}
