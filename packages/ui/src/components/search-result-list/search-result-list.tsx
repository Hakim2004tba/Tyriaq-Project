import * as React from "react";
import { Search } from "lucide-react";
import type { SearchResult } from "@flow/types";
import { SearchResultItem } from "../search-result-item/search-result-item";
import { EmptyState } from "../empty-state/empty-state";
import { Skeleton } from "../skeleton/skeleton";
import { Alert } from "../alert/alert";

export interface SearchResultListProps {
  results: SearchResult[];
  query: string;
  loading?: boolean;
  error?: string | null;
  /** Resolves a result's context label (see SearchResultItem) —
   * supplied by the caller, which owns route/entity resolution. */
  resolveContextLabel?: (result: SearchResult) => string | undefined;
  /** Index into `results` currently highlighted via arrow-key
   * navigation — the caller owns the actual key-listening (it varies
   * by surface: a global ⌘K listener vs. a plain input on the full
   * page), this just renders whichever index it's told. */
  highlightedIndex?: number;
  onSelectResult: (result: SearchResult) => void;
}

/** A reusable results list — no fetching, no debounce, no Supabase.
 * Loading/empty/error states folded in here rather than split into
 * separate SearchEmptyState/SearchLoadingState components, matching
 * the NotificationList precedent from Phase 08. */
export function SearchResultList({ results, query, loading, error, resolveContextLabel, highlightedIndex, onSelectResult }: SearchResultListProps) {
  if (loading) {
    return (
      <div className="flex flex-col gap-2 p-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2">
            <Skeleton className="size-8 rounded-md" />
            <div className="flex-1 flex flex-col gap-1.5">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3">
        <Alert variant="danger">{error}</Alert>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <EmptyState
        icon={<Search className="size-5" />}
        title={query ? "No results found" : "Search this workspace"}
        description={query ? `Nothing matches "${query}".` : "Find projects, tasks, documents, and comments."}
      />
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      {results.map((result, i) => (
        <SearchResultItem
          key={`${result.entityType}-${result.entityId}`}
          result={result}
          contextLabel={resolveContextLabel?.(result)}
          highlighted={highlightedIndex === i}
          onSelect={() => onSelectResult(result)}
        />
      ))}
    </div>
  );
}
