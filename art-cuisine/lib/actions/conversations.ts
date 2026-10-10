"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import {
  CONVERSATIONS,
  CONVERSATION_MESSAGES,
  type ConversationRecord,
  type MessageAttachmentRecord,
} from "@/lib/data/operations";
import { getClientByEmail } from "@/lib/data/clients";
import { getConversationById, canAccessConversation } from "@/lib/data/conversations";
import { notifyEmail } from "@/lib/notify";
import { listUsers } from "@/lib/auth/queries";
import { isStaffRole, type Role } from "@/lib/auth/roles";

type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_ATTACHMENTS = 5;

function revalidateConversation(id: string): void {
  revalidatePath("/dashboard/mes-messages");
  revalidatePath("/dashboard/messagerie");
  revalidatePath(`/dashboard/messagerie/${id}`);
  revalidatePath(`/dashboard/mes-messages/${id}`);
}

async function requireAccess(conversationId: string) {
  const user = await requireSession();
  const conversation = getConversationById(conversationId);
  if (!conversation) return { ok: false as const, error: "Conversation introuvable." };
  if (!canAccessConversation(user, conversation)) {
    return { ok: false as const, error: "Vous n'avez pas accès à cette conversation." };
  }
  return { ok: true as const, user, conversation };
}

export async function sendConversationMessage(conversationId: string, formData: FormData): Promise<ActionResult> {
  const result = await requireAccess(conversationId);
  if (!result.ok) return result;
  const { user, conversation } = result;

  const content = typeof formData.get("content") === "string" ? (formData.get("content") as string).trim() : "";
  const files = formData.getAll("attachments").filter((f): f is File => f instanceof File && f.size > 0);

  if (!content && files.length === 0) {
    return { ok: false, error: "Écrivez un message ou joignez un fichier." };
  }
  if (files.length > MAX_ATTACHMENTS) {
    return { ok: false, error: `Vous ne pouvez joindre que ${MAX_ATTACHMENTS} fichiers maximum.` };
  }
  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) {
      return { ok: false, error: `« ${file.name} » dépasse la taille maximale autorisée (8 Mo).` };
    }
  }

  const attachments: MessageAttachmentRecord[] = [];
  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const dataUrl = `data:${file.type || "application/octet-stream"};base64,${buffer.toString("base64")}`;
    attachments.push({
      id: `ATT-${randomUUID().slice(0, 8).toUpperCase()}`,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeLabel: file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(1)} Mo` : `${Math.max(1, Math.round(file.size / 1024))} Ko`,
      dataUrl,
    });
  }

  const participant = conversation.participants.find((p) => p.email.toLowerCase() === user.email.toLowerCase());
  const now = new Date().toISOString();

  CONVERSATION_MESSAGES.push({
    id: `CMSG-${randomUUID().slice(0, 8).toUpperCase()}`,
    conversationId,
    authorEmail: user.email,
    authorName: user.name,
    authorRole: participant?.role ?? user.role,
    content,
    attachments,
    createdAt: now,
    readBy: [user.email],
  });

  conversation.updatedAt = now;

  for (const p of conversation.participants) {
    if (p.email.toLowerCase() === user.email.toLowerCase()) continue;
    notifyEmail(p.email, {
      type: "new_message",
      title: `Nouveau message — ${conversation.title}`,
      description: content || `${files.length} pièce${files.length > 1 ? "s" : ""} jointe${files.length > 1 ? "s" : ""}`,
      link: "/dashboard/mes-messages",
    });
  }

  revalidateConversation(conversationId);
  return { ok: true, data: undefined };
}

export async function markConversationRead(conversationId: string): Promise<ActionResult> {
  const result = await requireAccess(conversationId);
  if (!result.ok) return result;
  const { user } = result;

  for (const message of CONVERSATION_MESSAGES) {
    if (message.conversationId !== conversationId) continue;
    if (!message.readBy.some((e) => e.toLowerCase() === user.email.toLowerCase())) {
      message.readBy.push(user.email);
    }
  }

  revalidateConversation(conversationId);
  return { ok: true, data: undefined };
}

const CLIENT_THREAD_TYPES = ["client_commercial", "client_designer", "client_company"] as const;

const startSchema = z.object({
  type: z.enum(CLIENT_THREAD_TYPES),
  content: z.string().trim().min(1, "Écrivez un message."),
});

/**
 * Lets a client start (or continue) their commercial/designer/company thread
 * without needing a staff member to have initiated it first — finds their
 * existing conversation of that type, or opens a new one addressed to their
 * assigned commercial (falling back to the admin for company/general support).
 */
export async function startClientConversation(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requireSession();
  const client = await getClientByEmail(user.email);
  if (!client) return { ok: false, error: "Aucun compte client associé à cette adresse e-mail." };

  const parsed = startSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  let conversation = CONVERSATIONS.find((c) => c.type === parsed.data.type && c.clientId === client.id);

  if (!conversation) {
    const admin = listUsers().find((u) => u.role === "admin");
    if (!admin) return { ok: false, error: "Aucun interlocuteur disponible pour le moment." };

    const titleSuffix = parsed.data.type === "client_commercial" ? "Commercial" : parsed.data.type === "client_designer" ? "Designer" : "ART Cuisine";
    const role = parsed.data.type === "client_commercial" ? "Commercial" : parsed.data.type === "client_designer" ? "Designer" : "Entreprise";

    const newConversation: ConversationRecord = {
      id: `CONV-${randomUUID().slice(0, 8).toUpperCase()}`,
      type: parsed.data.type,
      title: `${client.name} — ${titleSuffix}`,
      clientId: client.id,
      clientName: client.name,
      projectRef: null,
      participants: [
        { email: client.email, name: client.name, role: "Client" },
        { email: admin.email, name: admin.name, role },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    CONVERSATIONS.unshift(newConversation);
    conversation = newConversation;
  }

  const now = new Date().toISOString();
  CONVERSATION_MESSAGES.push({
    id: `CMSG-${randomUUID().slice(0, 8).toUpperCase()}`,
    conversationId: conversation.id,
    authorEmail: user.email,
    authorName: user.name,
    authorRole: "Client",
    content: parsed.data.content,
    attachments: [],
    createdAt: now,
    readBy: [user.email],
  });
  conversation.updatedAt = now;

  for (const p of conversation.participants) {
    if (p.email.toLowerCase() === user.email.toLowerCase()) continue;
    notifyEmail(p.email, {
      type: "new_message",
      title: `Nouveau message — ${conversation.title}`,
      description: parsed.data.content,
      link: "/dashboard/messagerie",
    });
  }

  revalidateConversation(conversation.id);
  return { ok: true, data: { id: conversation.id } };
}

const createStaffConversationSchema = z.object({
  type: z.enum(["internal", "project"]),
  title: z.string().trim().min(2, "Le titre est requis."),
  participantEmails: z.array(z.string().email()).min(1, "Choisissez au moins un participant."),
  projectRef: z.string().trim().optional().nullable(),
  content: z.string().trim().min(1, "Écrivez un message."),
});

/** Staff-only: opens a new internal or project-specific thread with chosen colleagues. */
export async function createStaffConversation(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requireSession();
  if (!isStaffRole(user.role as Role)) {
    return { ok: false, error: "Réservé à l'équipe." };
  }

  const parsed = createStaffConversationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const staffDirectory = listUsers().filter((u) => isStaffRole(u.role));
  const participants = parsed.data.participantEmails
    .map((email) => staffDirectory.find((u) => u.email.toLowerCase() === email.toLowerCase()))
    .filter((u): u is NonNullable<typeof u> => Boolean(u))
    .map((u) => ({ email: u.email, name: u.name, role: "Interne" }));

  if (!participants.some((p) => p.email.toLowerCase() === user.email.toLowerCase())) {
    participants.push({ email: user.email, name: user.name, role: "Interne" });
  }
  if (participants.length === 0) {
    return { ok: false, error: "Aucun participant valide." };
  }

  const now = new Date().toISOString();
  const conversation: ConversationRecord = {
    id: `CONV-${randomUUID().slice(0, 8).toUpperCase()}`,
    type: parsed.data.type,
    title: parsed.data.title,
    clientId: null,
    clientName: null,
    projectRef: parsed.data.projectRef || null,
    participants,
    createdAt: now,
    updatedAt: now,
  };
  CONVERSATIONS.unshift(conversation);

  CONVERSATION_MESSAGES.push({
    id: `CMSG-${randomUUID().slice(0, 8).toUpperCase()}`,
    conversationId: conversation.id,
    authorEmail: user.email,
    authorName: user.name,
    authorRole: "Interne",
    content: parsed.data.content,
    attachments: [],
    createdAt: now,
    readBy: [user.email],
  });

  for (const p of participants) {
    if (p.email.toLowerCase() === user.email.toLowerCase()) continue;
    notifyEmail(p.email, {
      type: "new_message",
      title: `Nouvelle conversation — ${conversation.title}`,
      description: parsed.data.content,
      link: "/dashboard/messagerie",
    });
  }

  revalidateConversation(conversation.id);
  return { ok: true, data: { id: conversation.id } };
}
