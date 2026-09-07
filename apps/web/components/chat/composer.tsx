"use client";

import { useMemo, useRef, useState } from "react";
import { Paperclip, Send, X } from "lucide-react";
import { Avatar, Button, IconButton, Textarea } from "@flow/ui";
import { cn } from "@flow/utils";
import type { ChatContext, ChatMessage } from "@/lib/data/chat-types";

interface Token {
  id: string;
  label: string;
  detail?: string;
  kind: "mention" | "task" | "project";
}

/**
 * The message box.
 *
 * `@`, `#` and `+` open the same picker over people, tasks and projects.
 * Choosing one inserts its display text AND records its id — the text is
 * what makes the sentence readable, the id is what makes the chip live.
 */
export function Composer({
  context,
  replyTo,
  onCancelReply,
  onSend,
  disabled,
  placeholder,
}: {
  context: ChatContext;
  replyTo: ChatMessage | null;
  onCancelReply: () => void;
  onSend: (input: {
    body: string;
    mentions: string[];
    taskRefs: string[];
    projectRefs: string[];
    files: File[];
  }) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [trigger, setTrigger] = useState<{ char: string; query: string; at: number } | null>(null);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  /*
    Ids are recorded as they are inserted rather than parsed back out of
    the text when sending. Two people can share a name and two tasks a
    title; re-deriving ids from words would pick whichever matched first.
  */
  const chosen = useRef<Token[]>([]);

  const matches = useMemo<Token[]>(() => {
    if (!trigger) return [];
    const q = trigger.query.toLowerCase();

    if (trigger.char === "@") {
      return context.people
        .filter((p) => p.name.toLowerCase().includes(q))
        .slice(0, 6)
        .map((p) => ({ id: p.id, label: p.name, kind: "mention" as const }));
    }
    if (trigger.char === "#") {
      return context.tasks
        .filter((t) => t.title.toLowerCase().includes(q))
        .slice(0, 6)
        .map((t) => ({ id: t.id, label: t.title, kind: "task" as const }));
    }
    return context.projects
      .filter((p) => p.name.toLowerCase().includes(q))
      .slice(0, 6)
      .map((p) => ({ id: p.id, label: p.name, kind: "project" as const }));
  }, [context, trigger]);

  function onChange(value: string, caret: number) {
    setBody(value);
    const before = value.slice(0, caret);
    const match = /(^|\s)([@#+])([^\s@#+]{0,40}(?: [^\s@#+]{0,20})?)$/.exec(before);
    if (!match) {
      setTrigger(null);
      return;
    }
    setActive(0);
    setTrigger({
      char: match[2]!,
      query: match[3] ?? "",
      at: caret - (match[2]!.length + (match[3] ?? "").length),
    });
  }

  function insert(token: Token) {
    if (!trigger) return;
    const prefix = trigger.char;
    const before = body.slice(0, trigger.at);
    const after = body.slice(trigger.at + prefix.length + trigger.query.length);
    const next = `${before}${prefix}${token.label} ${after}`;

    chosen.current = [...chosen.current.filter((t) => t.id !== token.id), token];
    setBody(next);
    setTrigger(null);

    requestAnimationFrame(() => {
      const el = inputRef.current;
      el?.focus();
      const pos = before.length + prefix.length + token.label.length + 1;
      el?.setSelectionRange(pos, pos);
    });
  }

  function send() {
    const text = body.trim();
    if (!text && files.length === 0) return;

    // Only references whose text survived editing are sent — deleting
    // "@Alice" from the sentence should not leave her mentioned.
    const used = chosen.current.filter((t) => text.includes(t.label));

    onSend({
      body: text || files.map((f) => f.name).join(", "),
      mentions: used.filter((t) => t.kind === "mention").map((t) => t.id),
      taskRefs: used.filter((t) => t.kind === "task").map((t) => t.id),
      projectRefs: used.filter((t) => t.kind === "project").map((t) => t.id),
      files,
    });

    setBody("");
    setFiles([]);
    chosen.current = [];
    setTrigger(null);
  }

  return (
    <div className="relative flex flex-col gap-2 border-t border-border bg-background/80 px-1 pb-1 pt-2 backdrop-blur-xl">
      {replyTo && (
        <div className="flex items-start gap-2 rounded-md border-l-2 border-primary bg-surface-muted px-2.5 py-1.5">
          <span className="min-w-0 flex-1">
            <span className="block text-caption text-text-muted">
              Replying to {replyTo.author.name}
            </span>
            <span className="block truncate text-body-sm text-text-secondary">{replyTo.body}</span>
          </span>
          <IconButton label="Cancel reply" size="sm" onClick={onCancelReply}>
            <X className="size-3.5" />
          </IconButton>
        </div>
      )}

      {files.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {files.map((file, i) => (
            <li
              key={`${file.name}-${i}`}
              className="flex items-center gap-1.5 rounded-md border border-border bg-surface-muted px-2 py-1 text-caption text-text-secondary"
            >
              <Paperclip className="size-3 shrink-0" aria-hidden="true" />
              <span className="max-w-[12rem] truncate">{file.name}</span>
              <button
                type="button"
                onClick={() => setFiles((prev) => prev.filter((_, index) => index !== i))}
                aria-label={`Remove ${file.name}`}
                className="text-text-muted transition-colors hover:text-danger focus-visible:outline-none"
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {matches.length > 0 && (
        <ul className="absolute bottom-full left-1 z-20 mb-2 max-h-60 w-72 overflow-y-auto rounded-md border border-border bg-surface-elevated py-1 shadow-lg">
          {matches.map((token, i) => (
            <li key={token.id}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  insert(token);
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-body-sm transition-colors",
                  i === active ? "bg-white/5 text-text-primary" : "text-text-secondary hover:bg-white/5"
                )}
              >
                {token.kind === "mention" && <Avatar name={token.label} size="xs" />}
                <span className="min-w-0 flex-1 truncate">{token.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-end gap-2">
        <input
          ref={fileRef}
          type="file"
          multiple
          className="sr-only"
          onChange={(e) => {
            setFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])]);
            e.target.value = "";
          }}
        />
        <IconButton
          label="Attach a file"
          variant="secondary"
          onClick={() => fileRef.current?.click()}
          disabled={disabled}
        >
          <Paperclip className="size-4" />
        </IconButton>

        <Textarea
          ref={inputRef}
          value={body}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value, e.target.selectionStart ?? e.target.value.length)}
          onKeyDown={(e) => {
            if (matches.length > 0) {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => (a + 1) % matches.length);
                return;
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => (a - 1 + matches.length) % matches.length);
                return;
              }
              if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                const token = matches[active];
                if (token) insert(token);
                return;
              }
              if (e.key === "Escape") {
                setTrigger(null);
                return;
              }
            }
            // Enter sends; Shift+Enter is a new line. The opposite makes
            // a chat feel like a form.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={placeholder ?? "Write a message… @ to mention, # for a task, + for a project"}
          aria-label="Write a message"
          className="max-h-40 min-h-[42px] flex-1 resize-none py-2.5"
        />

        <Button size="md" onClick={send} disabled={disabled || (!body.trim() && files.length === 0)}>
          <Send className="size-4" />
          <span className="sr-only sm:not-sr-only">Send</span>
        </Button>
      </div>
    </div>
  );
}
