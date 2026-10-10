import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/auth/session";
import { getConversationById, getMessagesForConversation, canAccessConversation, CONVERSATION_TYPE_LABELS } from "@/lib/data/conversations";
import { getClientById } from "@/lib/data/clients";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConversationThread } from "@/components/dashboard/messaging/conversation-thread";

export async function generateMetadata({ params }: PageProps<"/dashboard/messagerie/[id]">): Promise<Metadata> {
  const { id } = await params;
  const conversation = getConversationById(id);
  return { title: conversation ? `${conversation.title} — ART Cuisine` : "Messagerie — ART Cuisine" };
}

export default async function MessagerieThreadPage({ params }: PageProps<"/dashboard/messagerie/[id]">) {
  const user = await requireSession();
  const { id } = await params;

  const conversation = getConversationById(id);
  if (!conversation || !canAccessConversation(user, conversation)) notFound();

  const messages = getMessagesForConversation(id);
  const client = conversation.clientId ? await getClientById(conversation.clientId) : undefined;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link href="/dashboard/messagerie" className="flex w-fit items-center gap-1.5 text-sm font-medium text-text-muted hover:text-text-primary">
        <ArrowLeft className="h-3.5 w-3.5" /> Retour à la messagerie
      </Link>

      <div className="flex flex-wrap items-center gap-2">
        <h1 className="font-display text-xl font-medium text-text-primary sm:text-2xl">{conversation.title}</h1>
        <Badge variant="outline">{CONVERSATION_TYPE_LABELS[conversation.type]}</Badge>
        {conversation.clientName && <Badge variant="gold">{conversation.clientName}</Badge>}
        {conversation.projectRef && <Badge variant="info">{conversation.projectRef}</Badge>}
      </div>

      <Card className="p-5 sm:p-6">
        <ConversationThread
          conversationId={id}
          messages={messages}
          currentEmail={user.email}
          clientName={client?.name}
          clientPhone={client?.phone}
        />
      </Card>
    </div>
  );
}
