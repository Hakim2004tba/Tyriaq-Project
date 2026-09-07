"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Archive, FileText, Search } from "lucide-react";
import { Badge, EmptyState, Input, SectionCard } from "@flow/ui";
import { cn } from "@flow/utils";
import { SPACE_COLOR } from "@/components/shell";
import { formatRelative } from "@/lib/data/task-types";
import type { DocumentSummary } from "@/lib/data/document-types";

/**
 * Every document in the workspace, newest edit first.
 *
 * Archived pages are hidden behind a toggle rather than removed: an
 * archive nobody can open is indistinguishable from a delete, and the
 * whole point of archiving is that it is reversible.
 */
export function DocumentList({ documents }: { documents: DocumentSummary[] }) {
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return documents.filter((doc) => {
      if (doc.archived !== showArchived) return false;
      if (!q) return true;
      return doc.title.toLowerCase().includes(q) || doc.excerpt.toLowerCase().includes(q);
    });
  }, [documents, query, showArchived]);

  const archivedCount = documents.filter((d) => d.archived).length;

  return (
    <SectionCard
      title={showArchived ? "Archived" : "All documents"}
      subtitle={`${shown.length} ${shown.length === 1 ? "document" : "documents"}`}
      action={
        archivedCount > 0 && (
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            className="rounded text-caption text-text-muted transition-colors hover:text-text-primary
                       focus-visible:outline-none focus-visible:shadow-focus"
          >
            {showArchived ? "Show active" : `Archived (${archivedCount})`}
          </button>
        )
      }
    >
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-muted"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents…"
            aria-label="Search documents"
            className="pl-8"
          />
        </div>

        {shown.length === 0 ? (
          <EmptyState
            icon={showArchived ? <Archive className="size-5" /> : <FileText className="size-5" />}
            title={query ? "Nothing matches" : showArchived ? "Nothing archived" : "No documents yet"}
            description={
              query
                ? "No document has that in its title or opening lines."
                : showArchived
                  ? "Archived documents keep their contents and can be restored at any time."
                  : "Create one from the sidebar. Documents can hold notes, specs and meeting records, and can point at real tasks."
            }
          />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {shown.map((doc) => {
              const chip = doc.projectColor ? SPACE_COLOR[doc.projectColor] : null;
              return (
                <li key={doc.id}>
                  <Link
                    href={`/documents/${doc.id}`}
                    className="group flex min-w-0 items-start gap-3 py-3 transition-colors
                               focus-visible:outline-none focus-visible:shadow-focus"
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md ring-1 ring-inset",
                        chip ? cn(chip.chip, chip.text) : "bg-surface-elevated text-text-muted ring-border"
                      )}
                      aria-hidden="true"
                    >
                      <FileText className="size-4" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-body font-medium text-text-primary group-hover:text-primary">
                          {doc.title}
                        </span>
                        {doc.projectName && (
                          <Badge variant="neutral" size="sm">
                            {doc.projectName}
                          </Badge>
                        )}
                        {doc.archived && (
                          <Badge variant="neutral" size="sm">
                            Archived
                          </Badge>
                        )}
                      </span>
                      {doc.excerpt && (
                        <span className="mt-0.5 block truncate text-body-sm text-text-secondary">
                          {doc.excerpt}
                        </span>
                      )}
                      <span className="mt-1 block text-caption text-text-muted">
                        Edited {formatRelative(doc.updatedAt)}
                        {doc.updatedByName ? ` by ${doc.updatedByName}` : ""}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </SectionCard>
  );
}
