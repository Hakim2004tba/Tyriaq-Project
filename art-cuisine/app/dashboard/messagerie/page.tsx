import { requireSession } from "@/lib/auth/session";
import { getConversationsForUser } from "@/lib/data/conversations";
import { listUsers } from "@/lib/auth/queries";
import { isStaffRole } from "@/lib/auth/roles";
import { ConversationList } from "@/components/dashboard/messaging/conversation-list";
import { NewStaffConversationDialog } from "@/components/dashboard/messaging/new-staff-conversation-dialog";

export default async function MessagerieListPage() {
  const user = await requireSession();
  const conversations = getConversationsForUser(user);
  const staffDirectory = listUsers()
    .filter((u) => isStaffRole(u.role) && u.active)
    .map((u) => ({ email: u.email, name: u.name }));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-medium text-text-primary sm:text-3xl">Messagerie</h1>
          <p className="mt-1 text-sm text-text-muted">Conversations avec vos clients, votre équipe et par projet.</p>
        </div>
        <NewStaffConversationDialog staffDirectory={staffDirectory} currentEmail={user.email} />
      </div>

      <ConversationList conversations={conversations} basePath="/dashboard/messagerie" currentUser={user} />
    </div>
  );
}
