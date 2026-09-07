"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight, RefreshCw } from "lucide-react";
import { Button, toast } from "@flow/ui";
import { cn } from "@flow/utils";
import { DocumentEditor, type LinkableTask, type MentionablePerson, type SaveState } from "@/components/documents/editor/document-editor";
import { DocumentProperties } from "@/components/documents/document-properties";
import { DocumentSidebar } from "@/components/documents/document-sidebar";
import { renameDocument } from "@/lib/actions/document";
import { useDraft } from "@/components/tasks/use-draft";
import type { DocumentFolder, DocumentRecord, DocumentSummary } from "@/lib/data/document-types";
import type { Project } from "@/lib/data/types";

const SAVE_LABEL: Record<SaveState, string> = {
  idle: "",
  saving: "Saving…",
  saved: "Saved",
  error: "Not saved",
};

/**
 * One document, open.
 *
 * The tree stays on the left so moving between pages does not mean going
 * back to a list first, and the properties sit on the right where they
 * can be read without interrupting the writing column in the middle.
 */
export function DocumentWorkspace({
  document,
  folders,
  documents,
  projects,
  people,
  tasks,
  canDelete,
}: {
  document: DocumentRecord;
  folders: DocumentFolder[];
  documents: DocumentSummary[];
  projects: Project[];
  people: MentionablePerson[];
  tasks: LinkableTask[];
  canDelete: boolean;
}) {
  const router = useRouter();
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [staleSince, setStaleSince] = useState<number | null>(null);

  const [title, setTitle, flushTitle] = useDraft(document.title, (next) => {
    const clean = next.trim();
    if (!clean || clean === document.title) return;
    void renameDocument(document.id, clean).then((result) => {
      if (result.error) toast.error(result.error);
    });
  });

  // Reset when navigating between documents in the sidebar.
  const lastId = useRef(document.id);
  useEffect(() => {
    if (lastId.current !== document.id) {
      lastId.current = document.id;
      setSaveState("idle");
      setStaleSince(null);
    }
  }, [document.id]);

  const onOutOfDate = useCallback(() => setStaleSince(Date.now()), []);

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5">
        <Link
          href="/documents"
          className="truncate rounded text-body-sm text-text-muted transition-colors hover:text-text-primary
                     focus-visible:outline-none focus-visible:shadow-focus"
        >
          Documents
        </Link>
        <ChevronRight className="size-3.5 shrink-0 text-text-muted" aria-hidden="true" />
        <span className="truncate text-body-sm font-medium text-text-primary" aria-current="page">
          {document.title}
        </span>
      </nav>

      <div className="flex flex-col gap-6 lg:flex-row">
        <DocumentSidebar folders={folders} documents={documents} activeId={document.id} />

        <div className="flex min-w-0 flex-1 flex-col">
          {/*
            The stale banner is the honest alternative to live merging:
            two people typing here would each save a whole document over
            the other's, so when somebody else's save lands the reader is
            told rather than silently overwritten.
          */}
          {staleSince !== null && (
            <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-warning/40 bg-warning-subtle px-3 py-2">
              <p className="min-w-0 flex-1 text-body-sm text-text-primary">
                Somebody else edited this document. Reload to see their changes — anything you type
                before reloading will overwrite them.
              </p>
              <Button size="sm" variant="secondary" onClick={() => router.refresh()}>
                <RefreshCw className="size-3.5" />
                Reload
              </Button>
            </div>
          )}

          <div className="flex items-start gap-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={flushTitle}
              aria-label="Document title"
              placeholder="Untitled"
              className="min-w-0 flex-1 rounded-md bg-transparent text-h1 text-text-primary transition-colors
                         duration-fast placeholder:text-text-muted hover:bg-white/[0.03]
                         focus-visible:bg-white/[0.04] focus-visible:outline-none focus-visible:shadow-focus"
            />
            <span
              className={cn(
                "mt-3 shrink-0 text-caption tabular",
                saveState === "error" ? "text-danger" : "text-text-muted"
              )}
              aria-live="polite"
            >
              {SAVE_LABEL[saveState]}
            </span>
          </div>

          <DocumentEditor
            key={document.id}
            documentId={document.id}
            initialContent={document.content}
            people={people}
            tasks={tasks}
            editable={!document.archived}
            onSaveStateChange={setSaveState}
            onOutOfDate={onOutOfDate}
          />

          {document.archived && (
            <p className="rounded-md border border-dashed border-border px-3 py-2 text-body-sm text-text-muted">
              This document is archived and read-only. Restore it to edit.
            </p>
          )}
        </div>

        <DocumentProperties
          document={document}
          folders={folders}
          projects={projects}
          canDelete={canDelete}
        />
      </div>
    </div>
  );
}
