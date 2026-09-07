"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { MAX_ATTACHMENT_BYTES } from "@/lib/data/task-types";
import type { ActionResult } from "./workspace";

/**
 * Comments and files.
 *
 * As everywhere else, permissions are the database's answer, not this
 * file's: a comment on a task in someone else's workspace touches zero
 * rows, and editing another person's words is refused by policy rather
 * than by an `if` here. What these functions add is the work that cannot
 * happen in a policy — resolving mentions, moving bytes into Storage,
 * and minting a signed URL that expires.
 */

const BUCKET = "task-files";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function refresh() {
  revalidatePath("/projects", "layout");
  revalidatePath("/calendar");
}

export async function postComment(
  taskId: string,
  body: string,
  mentions: string[]
): Promise<ActionResult & { id?: string; createdAt?: string }> {
  const text = body.trim();
  if (!text) return { error: "Write something first." };
  if (text.length > 10000) return { error: "That comment is too long." };

  const user = await getCurrentUser();
  if (!user) return { error: "Sign in to comment." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_comments")
    .insert({
      task_id: taskId,
      // Overwritten by the trigger, which reads the task's real
      // workspace; a value is only needed to satisfy the column.
      workspace_id: taskId,
      author_id: user.id,
      body: text,
      // Anyone not in the workspace is dropped by the same trigger.
      mentions: mentions.filter((id) => UUID.test(id)),
    })
    .select("id, created_at")
    .single();

  if (error) return { error: error.message };
  refresh();
  return { id: data?.id, createdAt: data?.created_at };
}

export async function editComment(commentId: string, body: string): Promise<ActionResult> {
  const text = body.trim();
  if (!text) return { error: "A comment cannot be empty — delete it instead." };
  if (text.length > 10000) return { error: "That comment is too long." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("task_comments")
    // `edited_at` is set here rather than by a trigger so that a future
    // system-side update — a migration, a backfill — does not brand
    // somebody's comment as edited by them.
    .update({ body: text, edited_at: new Date().toISOString() })
    .eq("id", commentId);

  if (error) return { error: error.message };
  refresh();
  return {};
}

export async function deleteComment(commentId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("task_comments").delete().eq("id", commentId);
  if (error) return { error: error.message };
  refresh();
  return { message: "Comment deleted." };
}

/**
 * Records a file the browser has already put into Storage.
 *
 * The bytes do NOT travel through here. A Server Action accepts one
 * megabyte of request body by default, so routing a 25 MB attachment
 * through this function would fail on exactly the files people most
 * want to attach — and would move every byte twice, browser to server
 * to Storage, for no gain. The browser uploads straight into the bucket
 * under RLS, and this records what landed.
 *
 * The path is not trusted: the row's trigger rejects any path that does
 * not begin with this task's own workspace and id, which is the same
 * prefix the storage policies grant access from.
 */
export async function recordAttachment(input: {
  taskId: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}): Promise<ActionResult & { id?: string }> {
  if (!UUID.test(input.taskId)) return { error: "That task no longer exists." };
  if (input.sizeBytes > MAX_ATTACHMENT_BYTES) return { error: "Files are limited to 25 MB." };

  const user = await getCurrentUser();
  if (!user) return { error: "Sign in to attach files." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_attachments")
    .insert({
      task_id: input.taskId,
      // Both are replaced by the trigger from the task itself.
      workspace_id: input.taskId,
      uploaded_by: user.id,
      storage_path: input.storagePath,
      file_name: input.fileName.slice(0, 255) || "file",
      mime_type: input.mimeType || "application/octet-stream",
      size_bytes: input.sizeBytes,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  refresh();
  return { id: data?.id };
}

/**
 * Removes the row, then the object.
 *
 * The row is the one the policies guard, so if the caller is not allowed
 * to remove this attachment the delete affects nothing and the file is
 * left alone — the reverse order would delete bytes first and discover
 * the refusal afterwards.
 */
export async function removeAttachment(attachmentId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: row } = await supabase
    .from("task_attachments")
    .select("id, storage_path")
    .eq("id", attachmentId)
    .single();
  if (!row) return { error: "That file is already gone." };

  const { error, count } = await supabase
    .from("task_attachments")
    .delete({ count: "exact" })
    .eq("id", attachmentId);

  if (error) return { error: error.message };
  if (!count) return { error: "Only the person who uploaded a file, or an admin, can remove it." };

  const { error: storageError } = await supabase.storage.from(BUCKET).remove([row.storage_path]);
  if (storageError) {
    // The attachment is gone from the product either way; a stranded
    // object is a cleanup problem, not something to report as a failure
    // the person can act on.
    console.error("task-files: orphaned object", row.storage_path, storageError.message);
  }

  refresh();
  return { message: "File removed." };
}

/**
 * A short-lived URL for one file.
 *
 * Minted per click rather than rendered into the page: a URL embedded in
 * the HTML would still work after the file is removed or the person
 * loses access, for as long as whoever copied it kept it. Sixty seconds
 * is enough to open or save the file and not much else.
 */
export async function signAttachment(
  attachmentId: string,
  download = false
): Promise<ActionResult & { url?: string }> {
  const supabase = await createClient();

  // Reading the row first puts the request through the table's policies:
  // a caller who cannot see the attachment never reaches Storage.
  const { data: row } = await supabase
    .from("task_attachments")
    .select("storage_path, file_name")
    .eq("id", attachmentId)
    .single();
  if (!row) return { error: "That file is no longer available." };

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(row.storage_path, 60, download ? { download: row.file_name } : undefined);

  if (error || !data?.signedUrl) return { error: error?.message ?? "Could not open that file." };
  return { url: data.signedUrl };
}

/**
 * Logs time against a task.
 *
 * The task supplies the workspace and the project, so an entry cannot be
 * filed against work its author cannot see. `spent_on` defaults to today
 * but is separate from `created_at`: people log Friday's hours on
 * Monday, and a report that filed them under Monday would misdate the
 * week.
 */
export async function logTime(
  taskId: string,
  minutes: number,
  note: string,
  spentOn?: string
): Promise<ActionResult & { id?: string }> {
  if (!Number.isFinite(minutes) || minutes <= 0) return { error: "Enter how long you worked." };
  if (minutes > 1440) return { error: "A single entry cannot be longer than a day." };

  const user = await getCurrentUser();
  if (!user) return { error: "Sign in to log time." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("time_entries")
    .insert({
      task_id: taskId,
      // Both are replaced by the trigger, from the task itself.
      workspace_id: taskId,
      project_id: taskId,
      user_id: user.id,
      minutes: Math.round(minutes),
      note: note.trim().slice(0, 500),
      spent_on: spentOn && /^\d{4}-\d{2}-\d{2}$/.test(spentOn) ? spentOn : undefined,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  refresh();
  revalidatePath("/reports");
  return { id: data?.id };
}

export async function deleteTimeEntry(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("time_entries").delete().eq("id", id);
  if (error) return { error: error.message };
  refresh();
  revalidatePath("/reports");
  return {};
}
