import { requireSession } from "@/lib/auth/session";
import { getConversationsForUser } from "@/lib/data/conversations";
import { ConversationList } from "@/components/dashboard/messaging/conversation-list";
import { NewClientConversationDialog } from "@/components/dashboard/messaging/new-client-conversation-dialog";

export default async function MesMessagesPage() {
  const user = await requireSession();
  const conversations = getConversationsForUser(user);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-medium text-text-primary sm:text-3xl">Mes messages</h1>
          <p className="mt-1 text-sm text-text-muted">Échangez avec votre commercial, votre designer ou l&rsquo;équipe ART Cuisine.</p>
        </div>
        <NewClientConversationDialog />
      </div>

      <ConversationList conversations={conversations} basePath="/dashboard/mes-messages" currentUser={user} />
    </div>
  );
}
