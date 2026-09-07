import * as React from "react";
import { FolderKanban, CheckSquare, FileText, MessageSquare, User } from "lucide-react";
import type { SearchResult, SearchResultType } from "@flow/types";
import { ListItem } from "../list/list";
import { Badge } from "../badge/badge";
import { Avatar } from "../avatar/avatar";

const TYPE_ICONS: Record<SearchResultType, React.ElementType> = {
  project: FolderKanban,
  task: CheckSquare,
  document: FileText,
  comment: MessageSquare,
  person: User,
};

const TYPE_LABELS: Record<SearchResultType, string> = {
  project: "Project",
  task: "Task",
  document: "Document",
  comment: "Comment",
  person: "Person",
};

export interface SearchResultItemProps {
  result: SearchResult;
  /** Resolved display text for the result's context (e.g. a project
   * name for a task, or the parent task/document title for a comment)
   * — supplied by the caller, since resolving it requires knowing
   * routes/other entities this component has no business knowing. */
  contextLabel?: string;
  /** True when arrow-key navigation currently points at this row. */
  highlighted?: boolean;
  onSelect: () => void;
}

/** One search result row. Entity type is shown via icon + text label
 * (Badge), never color alone. Purely presentational — no fetching, no
 * navigation decision, no Supabase. */
export function SearchResultItem({ result, contextLabel, highlighted, onSelect }: SearchResultItemProps) {
  const Icon = TYPE_ICONS[result.entityType];

  return (
    <ListItem
      interactive
      onClick={onSelect}
      className={highlighted ? "bg-surface-muted" : undefined}
      leading={
        result.entityType === "person" ? (
          <Avatar name={result.title || "Unnamed"} size="sm" />
        ) : (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-muted text-text-secondary">
            <Icon className="size-4" aria-hidden="true" />
          </span>
        )
      }
      trailing={<Badge variant="neutral">{TYPE_LABELS[result.entityType]}</Badge>}
    >
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-body-sm font-medium text-text-primary">{result.title || "Untitled"}</span>
        {result.snippet && <span className="truncate text-body-sm text-text-secondary">{result.snippet}</span>}
        {contextLabel && <span className="truncate text-caption text-text-muted">{contextLabel}</span>}
      </span>
    </ListItem>
  );
}
