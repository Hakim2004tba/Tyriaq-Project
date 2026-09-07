import * as React from "react";
import { Plus } from "lucide-react";
import { SearchInput } from "../search-input/search-input";
import { Button } from "../button/button";

export interface DocumentToolbarProps {
  query: string;
  onQueryChange: (query: string) => void;
  onCreate?: () => void;
  createLabel?: string;
}

/** Shared by Workspace Docs and Project Docs — one toolbar, not two
 * duplicated ones (brief section 16-style reuse, same spirit as the
 * Task view toolbar in Phase 05). */
export function DocumentToolbar({ query, onQueryChange, onCreate, createLabel = "New Document" }: DocumentToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="w-full max-w-xs">
        <SearchInput placeholder="Search documents…" value={query} onChange={(e) => onQueryChange(e.target.value)} />
      </div>
      {onCreate && (
        <Button onClick={onCreate} className="shrink-0">
          <Plus className="size-4" />
          {createLabel}
        </Button>
      )}
    </div>
  );
}
