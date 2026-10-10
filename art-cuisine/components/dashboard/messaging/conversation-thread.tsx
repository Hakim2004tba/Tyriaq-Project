"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Paperclip, Send, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FormMessage } from "@/components/auth/form-message";
import { sendConversationMessage, markConversationRead } from "@/lib/actions/conversations";
import { WhatsAppShareLink } from "@/components/dashboard/devis/whatsapp-share-link";
import { formatShortDateTime } from "@/lib/format";
import type { ConversationMessageRecord } from "@/lib/data/operations";

function initials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
}

function AttachmentChip({ fileName, sizeLabel, dataUrl }: { fileName: string; sizeLabel: string; dataUrl: string }) {
  return (
    <a
      href={dataUrl}
      download={fileName}
      className="flex items-center gap-2 rounded-md border border-border-subtle bg-surface px-3 py-2 text-xs text-text-secondary hover:border-border-strong"
    >
      <FileText className="h-3.5 w-3.5 shrink-0 text-text-muted" />
      <span className="truncate">{fileName}</span>
      <span className="shrink-0 text-text-muted">· {sizeLabel}</span>
    </a>
  );
}

function ConversationThread({
  conversationId,
  messages,
  currentEmail,
  clientName,
  clientPhone,
}: {
  conversationId: string;
  messages: ConversationMessageRecord[];
  currentEmail: string;
  /** Only passed from the staff-side messagerie view — lets staff nudge the client on WhatsApp since they can't always check the site. */
  clientName?: string;
  clientPhone?: string | null;
}) {
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [content, setContent] = React.useState("");
  const [files, setFiles] = React.useState<File[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    markConversationRead(conversationId);
  }, [conversationId]);

  function handleFilesSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files;
    if (!selected) return;
    setFiles((prev) => [...prev, ...Array.from(selected)]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!content.trim() && files.length === 0) {
      setError("Écrivez un message ou joignez un fichier.");
      return;
    }
    setSubmitting(true);

    const formData = new FormData();
    formData.append("content", content);
    for (const file of files) formData.append("attachments", file);

    const result = await sendConversationMessage(conversationId, formData);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setContent("");
    setFiles([]);
    toast.success("Message envoyé");
    router.refresh();
  }

  const lastMessage = messages[messages.length - 1];

  return (
    <div className="flex flex-col gap-5">
      {clientName && (
        <div className="flex items-center justify-end">
          <WhatsAppShareLink
            phone={clientPhone ?? null}
            message={`Bonjour ${clientName}, vous avez un nouveau message sur votre espace client ART Cuisine${lastMessage ? ` : « ${lastMessage.content || "pièce jointe"} »` : ""}.`}
          />
        </div>
      )}
      <div className="flex flex-col gap-4">
        {messages.length === 0 && (
          <p className="py-8 text-center text-sm text-text-muted">Aucun message — écrivez le premier.</p>
        )}
        {messages.map((m) => {
          const isMine = m.authorEmail.toLowerCase() === currentEmail.toLowerCase();
          return (
            <div key={m.id} className={`flex gap-3 ${isMine ? "flex-row-reverse" : ""}`}>
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback>{initials(m.authorName)}</AvatarFallback>
              </Avatar>
              <div className={`flex max-w-[75%] flex-col gap-1.5 ${isMine ? "items-end" : "items-start"}`}>
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <span className="font-medium text-text-secondary">{m.authorName}</span>
                  <span>· {m.authorRole}</span>
                </div>
                {m.content && (
                  <div
                    className={`rounded-lg px-4 py-2.5 text-sm leading-relaxed ${
                      isMine ? "bg-ink-950 text-text-inverse" : "bg-surface-sunken text-text-primary"
                    }`}
                  >
                    {m.content}
                  </div>
                )}
                {m.attachments.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    {m.attachments.map((a) => (
                      <AttachmentChip key={a.id} fileName={a.fileName} sizeLabel={a.sizeLabel} dataUrl={a.dataUrl} />
                    ))}
                  </div>
                )}
                <span className="text-[0.6875rem] text-stone-400">{formatShortDateTime(m.createdAt)}</span>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 border-t border-border-subtle pt-4">
        {error && <FormMessage>{error}</FormMessage>}

        {files.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {files.map((file, i) => (
              <span key={i} className="flex items-center gap-1.5 rounded-md border border-border-subtle bg-surface-sunken px-2.5 py-1.5 text-xs text-text-secondary">
                {file.name}
                <button type="button" onClick={() => removeFile(i)} className="text-text-muted hover:text-text-primary">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Écrivez votre message…"
          className="min-h-20"
        />

        <div className="flex items-center justify-between">
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFilesSelected} />
          <Button type="button" variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Paperclip className="h-3.5 w-3.5" /> Joindre un fichier
          </Button>
          <Button type="submit" disabled={submitting}>
            <Send className="h-3.5 w-3.5" /> {submitting ? "Envoi…" : "Envoyer"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export { ConversationThread };
