import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/auth/session";
import { getConversationById, getMessagesForConversation, canAccessConversation, CONVERSATION_TYPE_LABELS } from "@/lib/data/conversations";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConversationThread } from "@/components/dashboard/messaging/conversation-thread";

export async function generateMetadata({ params }: PageProps<"/dashboard/mes-messages/[id]">): Promise<Metadata> {
  const { id } = await params;
  const conversation = getConversationById(id);
  return { title: conversation ? `${conversation.title} — ART Cuisine` : "Messages — ART Cuisine" };
}

export default async function MesMessagesThreadPage({ params }: PageProps<"/dashboard/mes-messages/[id]">) {
  const user = await requireSession();
  const { id } = await params;

  const conversation = getConversationById(id);
  if (!conversation || !canAccessConversation(user, conversation)) notFound();

  const messages = getMessagesForConversation(id);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link href="/dashboard/mes-messages" className="flex w-fit items-center gap-1.5 text-sm font-medium text-text-muted hover:text-text-primary">
        <ArrowLeft className="h-3.5 w-3.5" /> Retour aux messages
      </Link>

      <div className="flex flex-wrap items-center gap-2">
        <h1 className="font-display text-xl font-medium text-text-primary sm:text-2xl">{conversation.title}</h1>
        <Badge variant="outline">{CONVERSATION_TYPE_LABELS[conversation.type]}</Badge>
      </div>

      <Card className="p-5 sm:p-6">
        <ConversationThread conversationId={id} messages={messages} currentEmail={user.email} />
      </Card>
    </div>
  );
}
