"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronRight,
  FileText,
  FolderPlus,
  Folder as FolderIcon,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  IconButton,
  toast,
} from "@flow/ui";
import { cn } from "@flow/utils";
import {
  createDocument,
  createFolder,
  deleteFolder,
  renameFolder,
} from "@/lib/actions/document";
import type { DocumentFolder, DocumentSummary } from "@/lib/data/document-types";

/**
 * The documents tree.
 *
 * Folders nest, so this renders itself recursively. Expansion is local
 * state: which folders a person has open is a property of their session,
 * not of the workspace, and persisting it would make two people's
 * sidebars fight over the same rows.
 */
export function DocumentSidebar({
  folders,
  documents,
  activeId,
}: {
  folders: DocumentFolder[];
  documents: DocumentSummary[];
  activeId: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [pending, startTransition] = useTransition();

  const childrenOf = useMemo(() => {
    const map = new Map<string | null, DocumentFolder[]>();
    for (const folder of folders) {
      const list = map.get(folder.parentId);
      if (list) list.push(folder);
      else map.set(folder.parentId, [folder]);
    }
    return map;
  }, [folders]);

  const docsInFolder = useMemo(() => {
    const map = new Map<string | null, DocumentSummary[]>();
    for (const doc of documents) {
      if (doc.archived) continue;
      const list = map.get(doc.folderId);
      if (list) list.push(doc);
      else map.set(doc.folderId, [doc]);
    }
    return map;
  }, [documents]);

  function run(fn: () => Promise<{ error?: string; message?: string } | void>) {
    startTransition(async () => {
      const result = await fn();
      if (result?.error) toast.error(result.error);
      else if (result?.message) toast.success(result.message);
    });
  }

  function newDocument(folderId: string | null) {
    startTransition(async () => {
      const result = await createDocument({ folderId });
      if (result.error || !result.id) {
        toast.error(result.error ?? "Could not create that document.");
        return;
      }
      router.push(`/documents/${result.id}`);
    });
  }

  function newFolder(parentId: string | null) {
    const name = window.prompt(parentId ? "Name for the nested folder" : "Name for the new folder");
    if (name === null) return;
    run(() => createFolder(name, parentId));
  }

  function renderFolder(folder: DocumentFolder, depth: number) {
    const isOpen = expanded.has(folder.id);
    const nested = childrenOf.get(folder.id) ?? [];
    const docs = docsInFolder.get(folder.id) ?? [];
    const isEmpty = nested.length === 0 && docs.length === 0;

    return (
      <li key={folder.id}>
        <div
          className="group flex items-center gap-1 rounded-md pr-1 transition-colors hover:bg-white/[0.04]"
          style={{ paddingLeft: `${depth * 12}px` }}
        >
          <button
            type="button"
            onClick={() =>
              setExpanded((prev) => {
                const next = new Set(prev);
                if (next.has(folder.id)) next.delete(folder.id);
                else next.add(folder.id);
                return next;
              })
            }
            aria-expanded={isOpen}
            className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md py-1.5 pl-1 text-left
                       focus-visible:outline-none focus-visible:shadow-focus"
          >
            <ChevronRight
              className={cn(
                "size-3.5 shrink-0 text-text-muted transition-transform duration-fast",
                isOpen && "rotate-90",
                isEmpty && "opacity-30"
              )}
              aria-hidden="true"
            />
            <FolderIcon className="size-3.5 shrink-0 text-text-muted" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-body-sm text-text-secondary">{folder.name}</span>
            {folder.documentCount > 0 && (
              <span className="shrink-0 text-caption tabular text-text-muted">{folder.documentCount}</span>
            )}
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <IconButton
                label={`Options for ${folder.name}`}
                size="sm"
                className="opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
              >
                <MoreHorizontal className="size-3.5" />
              </IconButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onSelect={() => newDocument(folder.id)}>
                <Plus className="size-4" />
                New document here
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => newFolder(folder.id)}>
                <FolderPlus className="size-4" />
                New folder inside
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  const name = window.prompt("Rename folder", folder.name);
                  if (name !== null) run(() => renameFolder(folder.id, name));
                }}
              >
                <Pencil className="size-4" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem destructive onSelect={() => run(() => deleteFolder(folder.id))}>
                <Trash2 className="size-4" />
                Delete folder
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {isOpen && (
          <ul className="flex flex-col">
            {nested.map((child) => renderFolder(child, depth + 1))}
            {docs.map((doc) => renderDocument(doc, depth + 1))}
            {isEmpty && (
              <li
                className="py-1 text-caption text-text-muted"
                style={{ paddingLeft: `${(depth + 1) * 12 + 26}px` }}
              >
                Empty
              </li>
            )}
          </ul>
        )}
      </li>
    );
  }

  function renderDocument(doc: DocumentSummary, depth: number) {
    const active = doc.id === activeId;
    return (
      <li key={doc.id}>
        <Link
          href={`/documents/${doc.id}`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          className={cn(
            "flex items-center gap-1.5 rounded-md py-1.5 pr-2 transition-colors duration-fast",
            "focus-visible:outline-none focus-visible:shadow-focus",
            active ? "bg-primary-muted text-primary" : "text-text-secondary hover:bg-white/[0.04]"
          )}
        >
          <FileText className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-body-sm">{doc.title}</span>
        </Link>
      </li>
    );
  }

  const rootFolders = childrenOf.get(null) ?? [];
  const rootDocs = docsInFolder.get(null) ?? [];

  return (
    <aside className="flex w-full shrink-0 flex-col gap-3 lg:w-64">
      <div className="flex items-center gap-1.5">
        <Button size="sm" className="flex-1" onClick={() => newDocument(null)} disabled={pending}>
          <Plus className="size-4" />
          New document
        </Button>
        <IconButton
          label="New folder"
          variant="secondary"
          onClick={() => newFolder(null)}
          disabled={pending}
        >
          <FolderPlus className="size-4" />
        </IconButton>
      </div>

      <nav aria-label="Documents">
        {rootFolders.length === 0 && rootDocs.length === 0 ? (
          <p className="rounded-md border border-dashed border-border px-3 py-3 text-body-sm text-text-muted">
            No documents yet. Create one, or make a folder to group them.
          </p>
        ) : (
          <ul className="flex flex-col">
            {rootFolders.map((folder) => renderFolder(folder, 0))}
            {rootDocs.map((doc) => renderDocument(doc, 0))}
          </ul>
        )}
      </nav>

      {pathname !== "/documents" && (
        <Link
          href="/documents"
          className="rounded-md px-2 py-1.5 text-caption text-text-muted transition-colors hover:text-text-primary
                     focus-visible:outline-none focus-visible:shadow-focus"
        >
          ← All documents
        </Link>
      )}
    </aside>
  );
}
