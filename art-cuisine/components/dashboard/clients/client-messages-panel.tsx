"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/format";
import { postClientMessage } from "@/lib/actions/clients";
import type { MessageRecord } from "@/lib/data/operations";

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

function ClientMessagesPanel({ clientId, messages }: { clientId: string; messages: MessageRecord[] }) {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const content = String(form.get("content") ?? "").trim();
    if (!content) return;

    setSubmitting(true);
    const result = await postClientMessage(clientId, { content });
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    formRef.current?.reset();
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex max-h-[28rem] flex-col gap-4 overflow-y-auto px-1 py-2">
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-text-muted">
            Aucun message échangé avec ce client pour le moment.
          </p>
        )}
        {messages.map((m) => {
          const isTeam = m.sender === "team";
          return (
            <div key={m.id} className={cn("flex items-end gap-2.5", isTeam && "flex-row-reverse")}>
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback className="text-[0.5625rem]">{initials(m.authorName)}</AvatarFallback>
              </Avatar>
              <div className={cn("flex max-w-[75%] flex-col gap-1", isTeam && "items-end")}>
                <div
                  className={cn(
                    "rounded-lg px-4 py-2.5 text-sm leading-relaxed",
                    isTeam
                      ? "rounded-br-sm bg-ink-950 text-white"
                      : "rounded-bl-sm bg-surface-sunken text-text-primary",
                  )}
                >
                  {m.content}
                </div>
                <span className="px-1 text-[0.6875rem] text-text-muted">
                  {m.authorName} · {formatRelativeTime(m.timestamp)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="flex items-end gap-3 border-t border-border-subtle pt-4">
        <Textarea
          name="content"
          placeholder="Écrire un message au client…"
          className="min-h-[3rem] flex-1"
          required
        />
        <Button type="submit" size="icon" disabled={submitting} aria-label="Envoyer">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

export { ClientMessagesPanel };
