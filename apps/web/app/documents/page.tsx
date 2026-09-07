import type { JSX } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";
import { SectionCard } from "@flow/ui";
import { DocumentList } from "@/components/documents/document-list";
import { DocumentSidebar } from "@/components/documents/document-sidebar";
import { getDocumentFolders, getDocuments, getRecentDocuments } from "@/lib/data/documents";
import { formatRelative } from "@/lib/data/task-types";

export const metadata: Metadata = {
  title: "Documents",
  description: "Notes, specs and records across your workspace.",
};

export default async function DocumentsPage(): Promise<JSX.Element> {
  const [folders, documents, recent] = await Promise.all([
    getDocumentFolders(),
    getDocuments(),
    getRecentDocuments(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1 text-text-primary">Documents</h1>
        <p className="text-body text-text-secondary">
          Notes, specs and meeting records. A document can point at real tasks rather than repeating them.
        </p>
      </header>

      <div className="flex flex-col gap-6 lg:flex-row">
        <DocumentSidebar folders={folders} documents={documents} activeId={null} />

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {recent.length > 0 && (
            <SectionCard title="Recent" subtitle="Where you left off">
              <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {recent.map((doc) => (
                  <li key={doc.id}>
                    <Link
                      href={`/documents/${doc.id}`}
                      className="flex h-full min-w-0 flex-col gap-1 rounded-lg border border-border bg-surface-muted
                                 px-3 py-2.5 transition-colors duration-fast hover:border-border-strong
                                 focus-visible:outline-none focus-visible:shadow-focus"
                    >
                      <span className="flex items-center gap-1.5">
                        <FileText className="size-3.5 shrink-0 text-text-muted" aria-hidden="true" />
                        <span className="truncate text-body-sm font-medium text-text-primary">{doc.title}</span>
                      </span>
                      {doc.excerpt && (
                        <span className="line-clamp-2 text-caption leading-[16px] text-text-secondary">
                          {doc.excerpt}
                        </span>
                      )}
                      <span className="mt-auto pt-1 text-caption tabular text-text-muted">
                        {formatRelative(doc.updatedAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          <DocumentList documents={documents} />
        </div>
      </div>
    </div>
  );
}
