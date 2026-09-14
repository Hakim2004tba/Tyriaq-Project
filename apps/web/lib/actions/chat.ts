"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import type { ActionResult } from "./workspace";

/**
 * Chat writes.
 *
 * Permissions are the database's: reading a project channel does not let
 * you post in it, only the author edits their own words, and a reaction
 * is removable only by the person who left it. None of that is
 * re-implemented here.
 */

const BUCKET = "chat-files";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function refresh() {
  revalidatePath("/chat", "layout");
}

export async function openDirectMessage(userId: string): Promise<ActionResult & { id?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("open_direct_message", { other_user: userId });
  if (error) return { error: error.message };
  refresh();
  return { id: (data as { id: string } | null)?.id };
}

export async function createGroupConversation(
  title: string,
  memberIds: string[]
): Promise<ActionResult & { id?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_group_conversation", {
    conversation_title: title,
    member_ids: memberIds.filter((id) => UUID.test(id)),
  });
  if (error) return { error: error.message };
  refresh();
  return { id: (data as { id: string } | null)?.id };
}

export async function openProjectConversation(
  projectId: string
): Promise<ActionResult & { id?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("open_project_conversation", {
    target_project: projectId,
  });
  if (error) return { error: error.message };
  refresh();
  return { id: (data as { id: string } | null)?.id };
}

/** Joining is what turns a readable channel into one you can post in. */
export async function joinConversation(conversationId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in first." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("conversation_members")
    .insert({ conversation_id: conversationId, user_id: user.id, workspace_id: conversationId });

  if (error) return { error: error.message };
  refresh();
  return { message: "Joined." };
}

export async function sendMessage(input: {
  conversationId: string;
  body: string;
  replyToId?: string | null;
  mentions?: string[];
  taskRefs?: string[];
  projectRefs?: string[];
}): Promise<ActionResult & { id?: string; createdAt?: string }> {
  const body = input.body.trim();
  if (!body) return { error: "Write something first." };
  if (body.length > 8000) return { error: "That message is too long." };

  const user = await getCurrentUser();
  if (!user) return { error: "Sign in to send messages." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: input.conversationId,
      // Replaced by the trigger with the conversation's real workspace.
      workspace_id: input.conversationId,
      author_id: user.id,
      body,
      reply_to_id: input.replyToId ?? null,
      mentions: (input.mentions ?? []).filter((id) => UUID.test(id)),
      task_refs: (input.taskRefs ?? []).filter((id) => UUID.test(id)),
      project_refs: (input.projectRefs ?? []).filter((id) => UUID.test(id)),
    })
    .select("id, created_at")
    .single();

  if (error) return { error: error.message };
  refresh();
  return { id: data?.id, createdAt: data?.created_at };
}

export async function editMessage(id: string, body: string): Promise<ActionResult> {
  const clean = body.trim();
  if (!clean) return { error: "A message cannot be empty — delete it instead." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("messages")
    .update({ body: clean, edited_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: error.message };
  refresh();
  return {};
}

export async function deleteMessage(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("messages").delete().eq("id", id);
  if (error) return { error: error.message };
  refresh();
  return {};
}

/**
 * One emoji, toggled.
 *
 * Delete-then-insert rather than an upsert, because the primary key is
 * (message, person, emoji) and "already there" is the signal to remove
 * it — an upsert would make the second click a no-op instead.
 */
export async function toggleReaction(
  messageId: string,
  emoji: string,
  add: boolean
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in first." };
  if (emoji.length > 24) return { error: "That is not an emoji." };

  const supabase = await createClient();
  const { error } = add
    ? await supabase
        .from("message_reactions")
        .insert({ message_id: messageId, user_id: user.id, emoji, workspace_id: messageId })
    : await supabase
        .from("message_reactions")
        .delete()
        .eq("message_id", messageId)
        .eq("user_id", user.id)
        .eq("emoji", emoji);

  if (error) return { error: error.message };
  return {};
}

/** Records a file the browser has already put into storage. */
export async function recordMessageAttachment(input: {
  messageId: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}): Promise<ActionResult & { id?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in first." };
  if (input.sizeBytes > 25 * 1024 * 1024) return { error: "Files are limited to 25 MB." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("message_attachments")
    .insert({
      message_id: input.messageId,
      workspace_id: input.messageId,
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

export async function signChatFile(
  attachmentId: string,
  download = false
): Promise<ActionResult & { url?: string }> {
  const supabase = await createClient();
  // Reading the row first puts the request through the table's policies.
  const { data: row } = await supabase
    .from("message_attachments")
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
 * Marks a conversation read up to now.
 *
 * `now()` from the client's clock would drift; the value is written
 * server-side so "unread" means the same thing on every device.
 */
export async function markConversationRead(conversationId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return {};

  const supabase = await createClient();
  const { error } = await supabase
    .from("conversation_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/chat", "layout");
  return {};
}

export async function setConversationMuted(
  conversationId: string,
  muted: boolean
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return {};

  const supabase = await createClient();
  const { error } = await supabase
    .from("conversation_members")
    .update({ muted })
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  refresh();
  return {};
}

/** Turns a message into a real task on a real board. */
export async function createTaskFromMessage(
  messageId: string,
  projectId: string,
  title?: string
): Promise<ActionResult & { taskId?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_task_from_message", {
    message_id: messageId,
    target_project: projectId,
    task_title: title?.trim() || null,
  });

  if (error) return { error: error.message };
  refresh();
  revalidatePath("/projects", "layout");
  return { taskId: (data as { id: string } | null)?.id, message: "Task created." };
}

/**
 * Full-text search across every message the caller can read.
 *
 * `websearch_to_tsquery` rather than raw `ilike`: it uses the index, and
 * it understands quoted phrases and `-exclusions` the way people expect
 * a search box to.
 */
export async function searchMessages(query: string): Promise<{
  results: {
    id: string;
    conversationId: string;
    body: string;
    createdAt: string;
    authorName: string;
  }[];
  error?: string;
}> {
  const q = query.trim();
  if (q.length < 2) return { results: [] };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .select("id, conversation_id, body, created_at, profiles!author_id(full_name)")
    .textSearch("search", q, { type: "websearch", config: "simple" })
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) return { results: [], error: error.message };

  return {
    results: ((data ?? []) as unknown as {
      id: string; conversation_id: string; body: string; created_at: string;
      profiles: { full_name: string } | null;
    }[]).map((row) => ({
      id: row.id,
      conversationId: row.conversation_id,
      body: row.body,
      createdAt: row.created_at,
      authorName: row.profiles?.full_name || "Unknown",
    })),
  };
}

/**
 * The project's own channel, loaded in one call.
 *
 * Opened on demand: a project that nobody has ever talked in has no
 * conversation row, and creating one for every project at creation time
 * would fill the chat sidebar with empty channels nobody asked for.
 * The first time somebody opens the Chat tab, this makes it.
 *
 * Returns the messages too, so the tab does not pay two round trips
 * before it can render anything.
 */
export async function loadProjectChannel(projectId: string): Promise<{
  conversationId?: string;
  messages?: import("@/lib/data/chat-types").ChatMessage[];
  joined?: boolean;
  error?: string;
}> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in first." };

  const opened = await openProjectConversation(projectId);
  if (opened.error || !opened.id) return { error: opened.error ?? "Could not open the channel." };

  const supabase = await createClient();
  const { data: membership } = await supabase
    .from("conversation_members")
    .select("user_id")
    .eq("conversation_id", opened.id)
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: workspace } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  const { getMessages } = await import("@/lib/data/chat");
  const messages = await getMessages(
    opened.id,
    user.id,
    workspace?.role === "owner" || workspace?.role === "admin"
  );

  return { conversationId: opened.id, messages, joined: Boolean(membership) };
}

/**
 * Starts a conversation in the project's channel about one task.
 *
 * The message carries the task as a REFERENCE rather than a copy of its
 * title, so the line in the channel keeps showing the task's current
 * name and status — including after somebody renames it, which is
 * usually the moment the discussion was about.
 */
export async function discussTask(
  taskId: string
): Promise<ActionResult & { conversationId?: string }> {
  const supabase = await createClient();

  const { data: task } = await supabase
    .from("tasks")
    .select("id, title, project_id")
    .eq("id", taskId)
    .maybeSingle();
  if (!task) return { error: "That task no longer exists." };

  const opened = await openProjectConversation(task.project_id);
  if (opened.error || !opened.id) return { error: opened.error ?? "Could not open the channel." };

  // Joining first: posting in a channel you have only been reading is
  // what the membership row means, and the send would be refused
  // without it.
  await joinConversation(opened.id);

  const sent = await sendMessage({
    conversationId: opened.id,
    body: `#${task.title}`,
    taskRefs: [task.id],
  });
  if (sent.error) return { error: sent.error };

  return { conversationId: opened.id, message: "Posted to the project channel." };
}
