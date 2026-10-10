import {
  DOCUMENTS,
  DOCUMENT_VERSIONS,
  DOCUMENT_SHARES,
  DOCUMENT_EVENTS,
  DOCUMENT_CATEGORIES,
  type DocumentRecord,
  type DocumentCategory,
} from "@/lib/data/operations";

export { DOCUMENT_CATEGORIES };

export function getDocumentById(id: string): DocumentRecord | undefined {
  return DOCUMENTS.find((d) => d.id === id);
}

export function getDocumentsForClient(clientId: string): DocumentRecord[] {
  return DOCUMENTS.filter((d) => d.clientId === clientId).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function getDocumentsForDevis(devisId: string): DocumentRecord[] {
  return DOCUMENTS.filter((d) => d.devisId === devisId).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function getDocumentsForProject(projectRef: string): DocumentRecord[] {
  return DOCUMENTS.filter((d) => d.projectRef === projectRef).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export interface DocumentFilters {
  search?: string;
  category?: DocumentCategory | "toutes";
}

/**
 * `scope` restricts to documents for clients owned by that commercial (null
 * for admins, who see every document) — the same ownership model used by
 * Clients, Leads and Devis.
 */
export function filterDocuments(filters: DocumentFilters, clientCommercialById: Map<string, string>, scope: string | null): DocumentRecord[] {
  const search = filters.search?.trim().toLowerCase();

  return DOCUMENTS.filter((d) => {
    if (scope) {
      const commercial = d.clientId ? clientCommercialById.get(d.clientId) : undefined;
      if (commercial !== scope) return false;
    }
    if (search) {
      const haystack = `${d.name} ${d.clientName}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    if (filters.category && filters.category !== "toutes" && d.category !== filters.category) return false;
    return true;
  }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function getDocumentVersions(documentId: string) {
  return DOCUMENT_VERSIONS.filter((v) => v.documentId === documentId).sort((a, b) => b.version - a.version);
}

export function getDocumentShares(documentId: string) {
  return DOCUMENT_SHARES.filter((s) => s.documentId === documentId).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function getShareByToken(token: string) {
  return DOCUMENT_SHARES.find((s) => s.token === token);
}

export function isShareUsable(share: { revoked: boolean; expiresAt: string | null }): boolean {
  if (share.revoked) return false;
  if (share.expiresAt && new Date(share.expiresAt).getTime() < Date.now()) return false;
  return true;
}

export function getDocumentEvents(documentId: string) {
  return DOCUMENT_EVENTS.filter((e) => e.documentId === documentId).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

export interface DocumentListStats {
  total: number;
  categories: number;
  withFile: number;
  sharedActive: number;
}

export function getDocumentListStats(scope: string | null, clientCommercialById: Map<string, string>): DocumentListStats {
  const pool = scope
    ? DOCUMENTS.filter((d) => (d.clientId ? clientCommercialById.get(d.clientId) : undefined) === scope)
    : DOCUMENTS;

  return {
    total: pool.length,
    categories: new Set(pool.map((d) => d.category)).size,
    withFile: pool.filter((d) => d.dataUrl).length,
    sharedActive: DOCUMENT_SHARES.filter((s) => isShareUsable(s) && pool.some((d) => d.id === s.documentId)).length,
  };
}
