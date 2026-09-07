"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getCurrentWorkspace } from "@/lib/data/queries";
import type { DocumentContent } from "@/lib/data/document-types";
import type { ActionResult } from "./workspace";

/**
 * Document writes.
 *
 * Permissions are the database's, as everywhere: a member may edit any
 * document in their workspace, only the author or an admin may delete
 * one permanently, and archiving is an ordinary update available to all.
 */

function refresh(id?: string) {
  revalidatePath("/documents", "layout");
  if (id) revalidatePath(`/documents/${id}`);
}

export async function createDocument(input: {
  title?: string;
  folderId?: string | null;
  projectId?: string | null;
}): Promise<ActionResult & { id?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in to create a document." };

  const ws = await getCurrentWorkspace();
  if (!ws) return { error: "No workspace selected." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .insert({
      // Replaced by the trigger when a project is given; used as-is for
      // a workspace-level document.
      workspace_id: ws.id,
      folder_id: input.folderId ?? null,
      project_id: input.projectId ?? null,
      title: (input.title ?? "").trim().slice(0, 200) || "Untitled",
      created_by: user.id,
      updated_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  refresh();
  return { id: data?.id };
}

export async function renameDocument(id: string, title: string): Promise<ActionResult> {
  const clean = title.trim().slice(0, 200);
  if (!clean) return { error: "A document needs a title." };

  const user = await getCurrentUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("documents")
    .update({ title: clean, updated_by: user?.id ?? null })
    .eq("id", id);

  if (error) return { error: error.message };
  refresh(id);
  return {};
}

/**
 * Saves the body.
 *
 * The editor calls this on a pause in typing, not per keystroke — a
 * document is written in long runs, and one request per character would
 * be both slow and impossible to order correctly.
 */
export async function saveDocument(id: string, content: DocumentContent): Promise<ActionResult> {
  if (!content || content.type !== "doc") return { error: "That is not a document body." };

  const user = await getCurrentUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("documents")
    .update({ content, updated_by: user?.id ?? null })
    .eq("id", id);

  if (error) return { error: error.message };
  // The body is already on screen in the editor; this only refreshes the
  // list and its excerpts.
  revalidatePath("/documents");
  return {};
}

export async function moveDocument(
  id: string,
  input: { folderId?: string | null; projectId?: string | null }
): Promise<ActionResult> {
  const patch: Record<string, unknown> = {};
  if (input.folderId !== undefined) patch.folder_id = input.folderId;
  if (input.projectId !== undefined) patch.project_id = input.projectId;
  if (Object.keys(patch).length === 0) return {};

  const user = await getCurrentUser();
  patch.updated_by = user?.id ?? null;

  const supabase = await createClient();
  const { error } = await supabase.from("documents").update(patch).eq("id", id);
  if (error) return { error: error.message };
  refresh(id);
  return {};
}

export async function setDocumentArchived(id: string, archived: boolean): Promise<ActionResult> {
  const user = await getCurrentUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("documents")
    .update({ archived_at: archived ? new Date().toISOString() : null, updated_by: user?.id ?? null })
    .eq("id", id);

  if (error) return { error: error.message };
  refresh(id);
  return { message: archived ? "Document archived." : "Document restored." };
}

/**
 * Permanent deletion, with the redirect done here rather than by the
 * caller: the page the user is standing on is the thing being removed,
 * so leaving them there would render a 404 they did not ask for.
 */
export async function deleteDocument(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("documents")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) return { error: error.message };
  if (!count) return { error: "Only the person who created a document, or an admin, can delete it." };
  refresh();
  redirect("/documents");
}

/* ------------------------------------------------------------------ */
/* Folders                                                             */
/* ------------------------------------------------------------------ */

export async function createFolder(name: string, parentId?: string | null): Promise<ActionResult> {
  const clean = name.trim().slice(0, 120);
  if (!clean) return { error: "Give the folder a name." };

  const user = await getCurrentUser();
  if (!user) return { error: "Sign in first." };
  const ws = await getCurrentWorkspace();
  if (!ws) return { error: "No workspace selected." };

  const supabase = await createClient();
  const { error } = await supabase.from("document_folders").insert({
    workspace_id: ws.id,
    parent_id: parentId ?? null,
    name: clean,
    created_by: user.id,
  });

  if (error) return { error: error.message };
  refresh();
  return {};
}

export async function renameFolder(id: string, name: string): Promise<ActionResult> {
  const clean = name.trim().slice(0, 120);
  if (!clean) return { error: "A folder needs a name." };

  const supabase = await createClient();
  const { error } = await supabase.from("document_folders").update({ name: clean }).eq("id", id);
  if (error) return { error: error.message };
  refresh();
  return {};
}

/**
 * Removing a folder keeps its documents — they fall back to the root
 * rather than disappearing with the container, which is why this is
 * offered to every member and needs no confirmation about "and all its
 * contents".
 */
export async function deleteFolder(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("document_folders").delete().eq("id", id);
  if (error) return { error: error.message };
  refresh();
  return { message: "Folder removed. Its documents are now unfiled." };
}
