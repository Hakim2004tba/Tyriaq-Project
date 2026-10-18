import { eq, desc, asc } from "drizzle-orm";
import { getPgDb } from "@/lib/db/pg";
import { conversations as conversationsTable, conversationMessages as conversationMessagesTable } from "@/lib/db/schema";
import type { ConversationRecord, ConversationMessageRecord } from "@/lib/data/operations";

type AccessUser = { email: string; role: string };

export function canAccessConversation(user: AccessUser, conversation: ConversationRecord): boolean {
  if (user.role === "admin") return true;
  const target = user.email.toLowerCase();
  return conversation.participants.some((p) => p.email.toLowerCase() === target);
}

export async function getConversationsForUser(user: AccessUser): Promise<ConversationRecord[]> {
  const rows = (await getPgDb().select().from(conversationsTable).orderBy(desc(conversationsTable.updatedAt))) as ConversationRecord[];
  return rows.filter((c) => canAccessConversation(user, c));
}

export async function getConversationById(id: string): Promise<ConversationRecord | undefined> {
  const rows = await getPgDb().select().from(conversationsTable).where(eq(conversationsTable.id, id));
  return rows[0] as ConversationRecord | undefined;
}

export async function getConversationsForProject(projectRef: string): Promise<ConversationRecord[]> {
  const rows = await getPgDb()
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.projectRef, projectRef))
    .orderBy(desc(conversationsTable.updatedAt));
  return rows as ConversationRecord[];
}

export async function getMessagesForConversation(conversationId: string): Promise<ConversationMessageRecord[]> {
  const rows = await getPgDb()
    .select()
    .from(conversationMessagesTable)
    .where(eq(conversationMessagesTable.conversationId, conversationId))
    .orderBy(asc(conversationMessagesTable.createdAt));
  return rows as ConversationMessageRecord[];
}

export function isMessageUnreadFor(message: ConversationMessageRecord, email: string): boolean {
  const target = email.toLowerCase();
  return !message.readBy.some((e) => e.toLowerCase() === target);
}

/** A conversation counts as unread when it holds a message from someone else the current user hasn't opened yet. */
export async function isConversationUnread(conversation: ConversationRecord, user: AccessUser): Promise<boolean> {
  const target = user.email.toLowerCase();
  const messages = await getMessagesForConversation(conversation.id);
  return messages.some((m) => m.authorEmail.toLowerCase() !== target && isMessageUnreadFor(m, user.email));
}

export async function getUnreadConversationCount(user: AccessUser): Promise<number> {
  const conversations = await getConversationsForUser(user);
  const flags = await Promise.all(conversations.map((c) => isConversationUnread(c, user)));
  return flags.filter(Boolean).length;
}

export const CONVERSATION_TYPE_LABELS: Record<ConversationRecord["type"], string> = {
  client_commercial: "Client ↔ Commercial",
  client_designer: "Client ↔ Designer",
  client_company: "Client ↔ Entreprise",
  internal: "Équipe interne",
  project: "Projet",
};
