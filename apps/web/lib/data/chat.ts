import { createClient } from "@/lib/supabase/server";
import { reportReadError } from "./report";
import { getCurrentUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Person } from "./task-types";
import type {
  ChatMessage,
  Conversation,
  ConversationKind,
  MessageAttachment,
  MessageReaction,
} from "./chat-types";

/**
 * Chat reads.
 *
 * The conversation list is one query plus two small ones, not one query
 * per conversation: a sidebar showing twenty threads must not cost
 * twenty round trips, and unread counts in particular are tempting to
 * fetch per row.
 */

type MemberRow = {
  conversation_id: string;
  user_id: string;
  last_read_at: string;
  muted: boolean;
  profiles: { id: string; full_name: string } | null;
};

export async function getConversations(): Promise<Conversation[]> {
  if (!isSupabaseConfigured) return [];
  const user = await getCurrentUser();
  if (!user) return [];

  const supabase = await createClient();

  const { data: rows, error } = await supabase
    .from("conversations")
    .select("id, kind, title, project_id, last_message_at, projects(slug, name)")
    .order("last_message_at", { ascending: false, nullsFirst: false });
  reportReadError("getConversations", error);

  const conversations = (rows ?? []) as unknown as {
    id: string;
    kind: ConversationKind;
    title: string | null;
    project_id: string | null;
    last_message_at: string | null;
    projects: { slug: string; name: string } | null;
  }[];
  if (conversations.length === 0) return [];

  const ids = conversations.map((c) => c.id);

  const [{ data: memberRows, error: memberError }, { data: recentRows, error: recentError }] =
    await Promise.all([
      supabase
        .from("conversation_members")
        .select("conversation_id, user_id, last_read_at, muted, profiles!user_id(id, full_name)")
        .in("conversation_id", ids),
      /*
        Unread counts and previews come from the messages themselves.

        Only the columns needed to count and to show one line are
        fetched — a preview does not need the bodies of every message,
        just the newest, and the rest are reduced to a timestamp.
      */
      supabase
        .from("messages")
        .select("id, conversation_id, body, created_at, author_id")
        .in("conversation_id", ids)
        .order("created_at", { ascending: false })
        .limit(600),
    ]);
  reportReadError("getConversations:members", memberError);
  reportReadError("getConversations:recent", recentError);

  const membersByConversation = new Map<string, Person[]>();
  const mine = new Map<string, { lastReadAt: string; muted: boolean }>();

  for (const row of (memberRows ?? []) as unknown as MemberRow[]) {
    const person: Person = { id: row.user_id, name: row.profiles?.full_name || "Unknown" };
    const list = membersByConversation.get(row.conversation_id);
    if (list) list.push(person);
    else membersByConversation.set(row.conversation_id, [person]);

    if (row.user_id === user.id) {
      mine.set(row.conversation_id, { lastReadAt: row.last_read_at, muted: row.muted });
    }
  }

  const preview = new Map<string, string>();
  const unread = new Map<string, number>();
  for (const row of (recentRows ?? []) as unknown as {
    conversation_id: string; body: string; created_at: string; author_id: string;
  }[]) {
    if (!preview.has(row.conversation_id)) preview.set(row.conversation_id, row.body);

    const membership = mine.get(row.conversation_id);
    // Your own message is never unread, however long ago you last looked.
    if (!membership || row.author_id === user.id) continue;
    if (row.created_at > membership.lastReadAt) {
      unread.set(row.conversation_id, (unread.get(row.conversation_id) ?? 0) + 1);
    }
  }

  return conversations.map((row) => {
    const members = membersByConversation.get(row.id) ?? [];
    const counterpart =
      row.kind === "dm" ? members.find((m) => m.id !== user.id) ?? null : null;
    const membership = mine.get(row.id);

    return {
      id: row.id,
      kind: row.kind,
      title:
        row.kind === "group"
          ? row.title ?? "Group"
          : row.kind === "project"
            ? row.projects?.name ?? "Project"
            : counterpart?.name ?? "Direct message",
      projectId: row.project_id,
      projectSlug: row.projects?.slug ?? null,
      members,
      counterpart,
      lastMessageAt: row.last_message_at,
      lastMessagePreview: preview.get(row.id) ?? null,
      unreadCount: unread.get(row.id) ?? 0,
      joined: Boolean(membership),
      muted: membership?.muted ?? false,
    };
  });
}

type MessageRow = {
  id: string;
  conversation_id: string;
  author_id: string;
  body: string;
  created_at: string;
  edited_at: string | null;
  reply_to_id: string | null;
  mentions: string[] | null;
  task_refs: string[] | null;
  project_refs: string[] | null;
  profiles: { id: string; full_name: string } | null;
};

/**
 * One conversation's messages, newest `limit` of them, oldest first on
 * the way out — which is the order they are read in.
 */
export async function getMessages(
  conversationId: string,
  viewerId: string,
  isAdmin: boolean,
  limit = 200
): Promise<ChatMessage[]> {
  if (!isSupabaseConfigured) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .select(
      // Hinted by COLUMN, because two paths reach `profiles` from
      // `messages`: the author, and a second one round through
      // `message_reactions`. Unhinted, PostgREST refuses the whole query
      // as ambiguous rather than guessing — which is correct of it, and
      // meant chat came back with no authors at all.
      "id, conversation_id, author_id, body, created_at, edited_at, reply_to_id, mentions, task_refs, project_refs, profiles!author_id(id, full_name)"
    )
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  reportReadError("getMessages", error);

  const rows = ((data ?? []) as unknown as MessageRow[]).reverse();
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const [{ data: reactionRows, error: reactionError }, { data: attachmentRows, error: attachmentError }] =
    await Promise.all([
      supabase.from("message_reactions").select("message_id, user_id, emoji").in("message_id", ids),
      supabase
        .from("message_attachments")
        .select("id, message_id, file_name, mime_type, size_bytes, storage_path, uploaded_by")
        .in("message_id", ids),
    ]);
  reportReadError("getMessages:reactions", reactionError);
  reportReadError("getMessages:attachments", attachmentError);

  const reactions = new Map<string, Map<string, { count: number; mine: boolean }>>();
  for (const row of (reactionRows ?? []) as unknown as {
    message_id: string; user_id: string; emoji: string;
  }[]) {
    const forMessage = reactions.get(row.message_id) ?? new Map();
    const entry = forMessage.get(row.emoji) ?? { count: 0, mine: false };
    entry.count += 1;
    if (row.user_id === viewerId) entry.mine = true;
    forMessage.set(row.emoji, entry);
    reactions.set(row.message_id, forMessage);
  }

  const attachments = new Map<string, MessageAttachment[]>();
  for (const row of (attachmentRows ?? []) as unknown as {
    id: string; message_id: string; file_name: string; mime_type: string;
    size_bytes: number; storage_path: string; uploaded_by: string;
  }[]) {
    const item: MessageAttachment = {
      id: row.id,
      name: row.file_name,
      size: row.size_bytes,
      mimeType: row.mime_type,
      storagePath: row.storage_path,
      canRemove: row.uploaded_by === viewerId || isAdmin,
    };
    const list = attachments.get(row.message_id);
    if (list) list.push(item);
    else attachments.set(row.message_id, [item]);
  }

  // The quoted line on a reply comes from the batch already in hand.
  const byId = new Map(rows.map((r) => [r.id, r]));

  return rows.map((row) => {
    const parent = row.reply_to_id ? byId.get(row.reply_to_id) : undefined;
    const reactionList: MessageReaction[] = Array.from(
      (reactions.get(row.id) ?? new Map()).entries()
    ).map(([emoji, value]) => ({ emoji, count: value.count, mine: value.mine }));

    return {
      id: row.id,
      conversationId: row.conversation_id,
      author: { id: row.author_id, name: row.profiles?.full_name || "Unknown" },
      body: row.body,
      createdAt: row.created_at,
      edited: Boolean(row.edited_at),
      mine: row.author_id === viewerId,
      canDelete: row.author_id === viewerId || isAdmin,
      replyToId: row.reply_to_id,
      replyTo: parent
        ? {
            id: parent.id,
            authorName: parent.profiles?.full_name || "Unknown",
            body: parent.body,
          }
        : null,
      mentions: row.mentions ?? [],
      taskRefs: row.task_refs ?? [],
      projectRefs: row.project_refs ?? [],
      reactions: reactionList,
      attachments: attachments.get(row.id) ?? [],
    };
  });
}
