import {
  CONVERSATIONS,
  CONVERSATION_MESSAGES,
  type ConversationRecord,
  type ConversationMessageRecord,
} from "@/lib/data/operations";

type AccessUser = { email: string; role: string };

export function canAccessConversation(user: AccessUser, conversation: ConversationRecord): boolean {
  if (user.role === "admin") return true;
  const target = user.email.toLowerCase();
  return conversation.participants.some((p) => p.email.toLowerCase() === target);
}

export function getConversationsForUser(user: AccessUser): ConversationRecord[] {
  return CONVERSATIONS.filter((c) => canAccessConversation(user, c)).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function getConversationById(id: string): ConversationRecord | undefined {
  return CONVERSATIONS.find((c) => c.id === id);
}

export function getConversationsForProject(projectRef: string): ConversationRecord[] {
  return CONVERSATIONS.filter((c) => c.projectRef === projectRef).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function getMessagesForConversation(conversationId: string): ConversationMessageRecord[] {
  return CONVERSATION_MESSAGES.filter((m) => m.conversationId === conversationId).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export function isMessageUnreadFor(message: ConversationMessageRecord, email: string): boolean {
  const target = email.toLowerCase();
  return !message.readBy.some((e) => e.toLowerCase() === target);
}

/** A conversation counts as unread when it holds a message from someone else the current user hasn't opened yet. */
export function isConversationUnread(conversation: ConversationRecord, user: AccessUser): boolean {
  const target = user.email.toLowerCase();
  return getMessagesForConversation(conversation.id).some(
    (m) => m.authorEmail.toLowerCase() !== target && isMessageUnreadFor(m, user.email),
  );
}

export function getUnreadConversationCount(user: AccessUser): number {
  return getConversationsForUser(user).filter((c) => isConversationUnread(c, user)).length;
}

export const CONVERSATION_TYPE_LABELS: Record<ConversationRecord["type"], string> = {
  client_commercial: "Client ↔ Commercial",
  client_designer: "Client ↔ Designer",
  client_company: "Client ↔ Entreprise",
  internal: "Équipe interne",
  project: "Projet",
};
