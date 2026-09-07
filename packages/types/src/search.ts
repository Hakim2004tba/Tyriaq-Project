/** Search domain types (Phase 09). Mirrors search_workspace()'s
 * normalized output — see supabase/migrations/README.md. */

export const SEARCH_RESULT_TYPES = ["project", "task", "document", "comment", "person"] as const;
export type SearchResultType = (typeof SEARCH_RESULT_TYPES)[number];

/** One normalized result shape for all four entity types — the UI never
 * needs to know each entity's internal representation. */
export interface SearchResult {
  entityType: SearchResultType;
  entityId: string;
  title: string;
  snippet: string;
  projectId: string | null;
  taskId: string | null;
  documentId: string | null;
  rank: number;
  updatedAt: string;
}

/** `null`/omitted = all types. */
export interface SearchFilters {
  types?: SearchResultType[];
}
