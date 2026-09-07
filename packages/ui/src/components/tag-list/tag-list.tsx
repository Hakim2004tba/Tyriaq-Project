import * as React from "react";
import { X, Plus, Tag as TagIcon } from "lucide-react";
import type { Tag, TagColor } from "@flow/types";
import { cn } from "@flow/utils";
import { Input } from "../input/input";

/** Tag colours reuse the project_color palette (see the task_tags
 * migration), so a tag chip renders from the same design tokens as a
 * project badge — both themes handled by the token, not by this file. */
const TAG_COLOR_CLASSES: Record<TagColor, string> = {
  purple: "bg-primary-subtle text-primary",
  info: "bg-info-subtle text-info",
  success: "bg-success-subtle text-success",
  warning: "bg-warning-subtle text-warning",
  danger: "bg-danger-subtle text-danger",
  neutral: "bg-surface-muted text-text-secondary",
};

export interface TagChipProps {
  tag: Tag;
  /** When provided, the chip gets a remove affordance. Omit for a
   * read-only chip (list rows, board cards). */
  onRemove?: (tag: Tag) => void;
}

export function TagChip({ tag, onRemove }: TagChipProps) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-caption font-medium",
        TAG_COLOR_CLASSES[tag.color]
      )}
    >
      <span className="truncate">{tag.name}</span>
      {onRemove && (
        <button
          type="button"
          aria-label={`Remove tag ${tag.name}`}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(tag);
          }}
          className="shrink-0 rounded-full opacity-60 transition-opacity hover:opacity-100"
        >
          <X className="size-3" aria-hidden="true" />
        </button>
      )}
    </span>
  );
}

export interface TagListProps {
  /** Tags currently on the task. */
  tags: Tag[];
  /** Every tag in the workspace, for the suggestion list. */
  available?: Tag[];
  canManage: boolean;
  onAdd?: (name: string) => void;
  onAttach?: (tag: Tag) => void;
  onRemove?: (tag: Tag) => void;
}

/** A task's tags plus an inline "add tag" affordance. Purely
 * presentational — creating/attaching/detaching is entirely the
 * caller's responsibility, same contract as SubtaskList. */
export function TagList({ tags, available = [], canManage, onAdd, onAttach, onRemove }: TagListProps) {
  const [adding, setAdding] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  const attachedIds = new Set(tags.map((t) => t.id));
  const query = draft.trim().toLowerCase();
  // Suggest only workspace tags not already on this task, narrowed by
  // whatever has been typed so far.
  const suggestions = available
    .filter((t) => !attachedIds.has(t.id) && (!query || t.name.toLowerCase().includes(query)))
    .slice(0, 6);

  // An exact (case-insensitive) name match means "attach that one",
  // not "create a duplicate" — so the create row is hidden for it.
  const exactMatch = available.find((t) => t.name.toLowerCase() === query);

  function reset() {
    setDraft("");
    setAdding(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return reset();
    if (exactMatch && !attachedIds.has(exactMatch.id)) {
      onAttach?.(exactMatch);
    } else {
      onAdd?.(trimmed);
    }
    reset();
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map((tag) => (
          <TagChip key={tag.id} tag={tag} onRemove={canManage ? onRemove : undefined} />
        ))}

        {tags.length === 0 && !adding && <span className="text-body-sm text-text-muted">No tags</span>}

        {canManage && !adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-0.5 text-caption text-text-muted transition-colors hover:border-primary hover:text-primary"
          >
            <Plus className="size-3" aria-hidden="true" />
            Add tag
          </button>
        )}
      </div>

      {canManage && adding && (
        <div className="flex flex-col gap-1">
          <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
            <TagIcon className="size-3.5 shrink-0 text-text-muted" aria-hidden="true" />
            <Input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => {
                // Let a suggestion click land before collapsing.
                window.setTimeout(() => setAdding(false), 120);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") reset();
              }}
              placeholder="Tag name…"
              aria-label="Tag name"
              className="h-7 text-body-sm"
            />
          </form>

          {(suggestions.length > 0 || (query && !exactMatch)) && (
            <div className="flex flex-wrap gap-1.5 pl-5">
              {suggestions.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onAttach?.(tag);
                    reset();
                  }}
                >
                  <TagChip tag={tag} />
                </button>
              ))}
              {query && !exactMatch && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onAdd?.(draft.trim());
                    reset();
                  }}
                  className="text-caption text-primary hover:underline"
                >
                  Create “{draft.trim()}”
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
