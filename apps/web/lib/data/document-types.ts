import type { SpaceColor } from "./types";

/**
 * Documents.
 *
 * `content` is the editor's own JSON tree, stored and returned as-is.
 * Nothing in the application parses it except the editor and one
 * database function, which is what keeps a task reference a live pointer
 * rather than a copied title that goes stale the moment the task is
 * renamed.
 */

export interface DocumentFolder {
  id: string;
  name: string;
  parentId: string | null;
  position: number;
  /** Documents filed directly in this folder, archived ones excluded. */
  documentCount: number;
}

export interface DocumentSummary {
  id: string;
  title: string;
  folderId: string | null;
  projectId: string | null;
  projectName: string | null;
  projectColor: SpaceColor | null;
  archived: boolean;
  updatedAt: string;
  updatedByName: string | null;
  createdByName: string;
  createdById: string;
  /** First words of the body — the list's subtitle. */
  excerpt: string;
}

/** A ProseMirror document node, kept opaque outside the editor. */
export interface DocumentContent {
  type: "doc";
  content?: unknown[];
}

export interface DocumentRecord extends DocumentSummary {
  content: DocumentContent;
  /** Tasks this document points at, resolved live from `tasks`. */
  linkedTasks: LinkedTask[];
}

export interface LinkedTask {
  id: string;
  title: string;
  status: string;
  projectSlug: string | null;
}

export const EMPTY_DOC: DocumentContent = { type: "doc", content: [] };

/**
 * A plain-text opening line, for the document list.
 *
 * Walks the tree collecting text nodes and stops as soon as it has
 * enough — a long document should not be flattened in full to render a
 * one-line preview of its first sentence.
 */
export function excerptOf(content: unknown, limit = 140): string {
  const parts: string[] = [];
  let total = 0;

  const walk = (node: unknown): void => {
    if (total >= limit || node === null || typeof node !== "object") return;
    const n = node as { type?: string; text?: string; content?: unknown[] };
    if (n.type === "text" && typeof n.text === "string") {
      parts.push(n.text);
      total += n.text.length;
      return;
    }
    if (Array.isArray(n.content)) {
      for (const child of n.content) {
        if (total >= limit) return;
        walk(child);
      }
      // A paragraph break reads as a space once the tree is flattened.
      if (n.type && n.type !== "text") parts.push(" ");
    }
  };

  walk(content);
  const text = parts.join("").replace(/\s+/g, " ").trim();
  return text.length > limit ? `${text.slice(0, limit).trimEnd()}…` : text;
}
