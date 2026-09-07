import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { reportReadError } from "./report";
import { getCurrentUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  EMPTY_DOC,
  excerptOf,
  type DocumentContent,
  type DocumentFolder,
  type DocumentRecord,
  type DocumentSummary,
  type LinkedTask,
} from "./document-types";
import type { SpaceColor } from "./types";

/**
 * Document reads.
 *
 * Two columns here reach `profiles` — who wrote it and who last edited
 * it — so these embeds must say which. They are hinted by COLUMN name
 * rather than by constraint name: the column is part of the schema this
 * application defines, while a constraint name depends on how a
 * particular database happened to be built, which is exactly what broke
 * the comment queries.
 *
 * The list query deliberately does NOT fetch bodies. A workspace wiki is
 * mostly long documents, and pulling every body to render a sidebar
 * would move megabytes to draw a list of titles. The one exception is
 * the excerpt, which needs the body — so the list fetches it only for
 * the handful of recent documents that actually show one.
 */

const SUMMARY_COLUMNS = `
  id, title, folder_id, project_id, archived_at, updated_at, created_by,
  projects(name, color),
  author:profiles!created_by(id, full_name),
  editor:profiles!updated_by(id, full_name)
`;

type SummaryRow = {
  id: string;
  title: string;
  folder_id: string | null;
  project_id: string | null;
  archived_at: string | null;
  updated_at: string;
  created_by: string;
  projects: { name: string; color: SpaceColor } | null;
  author: { id: string; full_name: string } | null;
  editor: { id: string; full_name: string } | null;
  content?: unknown;
};

function toSummary(row: SummaryRow): DocumentSummary {
  return {
    id: row.id,
    title: row.title,
    folderId: row.folder_id,
    projectId: row.project_id,
    projectName: row.projects?.name ?? null,
    projectColor: row.projects?.color ?? null,
    archived: row.archived_at !== null,
    updatedAt: row.updated_at,
    updatedByName: row.editor?.full_name || null,
    createdByName: row.author?.full_name || "Unknown",
    createdById: row.created_by,
    excerpt: row.content ? excerptOf(row.content) : "",
  };
}

export const getDocumentFolders = cache(async (): Promise<DocumentFolder[]> => {
  if (!isSupabaseConfigured) return [];
  const user = await getCurrentUser();
  if (!user) return [];

  const supabase = await createClient();
  const [{ data, error }, { data: counts, error: countError }] = await Promise.all([
    supabase
      .from("document_folders")
      .select("id, name, parent_id, position")
      .order("position", { ascending: true })
      .order("name", { ascending: true }),
    // One query for every folder's count, rather than one per folder.
    supabase.from("documents").select("folder_id").is("archived_at", null),
  ]);
  reportReadError("getDocumentFolders", error);
  reportReadError("getDocumentFolders:counts", countError);

  const tally = new Map<string, number>();
  for (const row of (counts ?? []) as unknown as { folder_id: string | null }[]) {
    if (!row.folder_id) continue;
    tally.set(row.folder_id, (tally.get(row.folder_id) ?? 0) + 1);
  }

  return ((data ?? []) as unknown as {
    id: string; name: string; parent_id: string | null; position: number;
  }[]).map((row) => ({
    id: row.id,
    name: row.name,
    parentId: row.parent_id,
    position: row.position,
    documentCount: tally.get(row.id) ?? 0,
  }));
});

export const getDocuments = cache(async (): Promise<DocumentSummary[]> => {
  if (!isSupabaseConfigured) return [];
  const user = await getCurrentUser();
  if (!user) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select(SUMMARY_COLUMNS)
    .order("updated_at", { ascending: false });
  reportReadError("getDocuments", error);

  return ((data ?? []) as unknown as SummaryRow[]).map(toSummary);
});

/** The "Recent" rail — bodies included, because these show an excerpt. */
export const getRecentDocuments = cache(async (limit = 6): Promise<DocumentSummary[]> => {
  if (!isSupabaseConfigured) return [];
  const user = await getCurrentUser();
  if (!user) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select(`${SUMMARY_COLUMNS}, content`)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(limit);
  reportReadError("getRecentDocuments", error);

  return ((data ?? []) as unknown as SummaryRow[]).map(toSummary);
});

export const getDocument = cache(async (id: string): Promise<DocumentRecord | null> => {
  if (!isSupabaseConfigured) return null;
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select(`${SUMMARY_COLUMNS}, content`)
    .eq("id", id)
    .maybeSingle();
  reportReadError("getDocument", error);
  if (!data) return null;

  const row = data as unknown as SummaryRow & { content: DocumentContent };

  /*
    The referenced tasks are read from `tasks` through the link index,
    never from the document body. That is the whole point of storing a
    reference: the title and status shown inside the page are the task's
    current ones, not a copy taken when it was inserted.
  */
  const { data: links, error: linkError } = await supabase
    .from("document_task_links")
    .select("tasks(id, title, status, projects(slug))")
    .eq("document_id", id);
  reportReadError("getDocument:links", linkError);

  const linkedTasks: LinkedTask[] = ((links ?? []) as unknown as {
    tasks: { id: string; title: string; status: string; projects: { slug: string } | null } | null;
  }[]).flatMap((row) =>
    row.tasks
      ? [{
          id: row.tasks.id,
          title: row.tasks.title,
          status: row.tasks.status,
          projectSlug: row.tasks.projects?.slug ?? null,
        }]
      : []
  );

  return {
    ...toSummary(row),
    content: row.content ?? EMPTY_DOC,
    linkedTasks,
  };
});
