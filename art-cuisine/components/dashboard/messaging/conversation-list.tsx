import Link from "next/link";
import { MessageSquare, Paperclip } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/format";
import { getMessagesForConversation, isConversationUnread, CONVERSATION_TYPE_LABELS } from "@/lib/data/conversations";
import type { ConversationRecord } from "@/lib/data/operations";

function ConversationList({
  conversations,
  basePath,
  currentUser,
}: {
  conversations: ConversationRecord[];
  basePath: string;
  currentUser: { email: string; role: string };
}) {
  if (conversations.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 p-16 text-center">
        <MessageSquare className="h-8 w-8 text-text-muted" />
        <p className="text-sm text-text-muted">Aucune conversation pour le moment.</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {conversations.map((conv) => {
        const messages = getMessagesForConversation(conv.id);
        const last = messages[messages.length - 1];
        const unread = isConversationUnread(conv, currentUser);
        const hasAttachment = last?.attachments.length > 0;

        return (
          <Link key={conv.id} href={`${basePath}/${conv.id}`}>
            <Card className={`flex items-start gap-3 p-4 transition-shadow hover:shadow-elevation-md ${unread ? "border-accent/40 bg-accent-soft/10" : ""}`}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-accent-strong">
                <MessageSquare className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className={`truncate text-sm ${unread ? "font-semibold text-text-primary" : "font-medium text-text-primary"}`}>{conv.title}</p>
                  {last && <span className="shrink-0 text-xs text-text-muted">{formatRelativeTime(last.createdAt)}</span>}
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  {last ? (
                    <p className="truncate text-xs text-text-muted">
                      {hasAttachment && <Paperclip className="mr-1 inline h-3 w-3" />}
                      {last.authorName} — {last.content || "Pièce jointe"}
                    </p>
                  ) : (
                    <p className="text-xs text-text-muted">Aucun message</p>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="outline">{CONVERSATION_TYPE_LABELS[conv.type]}</Badge>
                  {unread && <span className="h-1.5 w-1.5 rounded-full bg-accent-strong" />}
                </div>
              </div>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

export { ConversationList };
