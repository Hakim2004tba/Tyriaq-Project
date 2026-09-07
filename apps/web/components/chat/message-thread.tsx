"use client";

import { useEffect, useRef, useState } from "react";
import {
  CornerUpLeft,
  Download,
  ListPlus,
  MoreHorizontal,
  Paperclip,
  Pencil,
  SmilePlus,
  Trash2,
} from "lucide-react";
import {
  Avatar,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  IconButton,
  Textarea,
} from "@flow/ui";
import { cn } from "@flow/utils";
import {
  dayLabel,
  isSameDay,
  timeLabel,
  REACTION_CHOICES,
  type ChatContext,
  type ChatMessage,
} from "@/lib/data/chat-types";
import { formatBytes, formatExact } from "@/lib/data/task-types";
import { MessageBody } from "./message-body";

/**
 * The conversation itself.
 *
 * Consecutive messages from one person within a few minutes are grouped
 * under a single avatar — a wall of repeated names and portraits is the
 * fastest way to make a short exchange unreadable.
 */
export function MessageThread({
  messages,
  context,
  viewerId,
  projects,
  onReply,
  onReact,
  onEdit,
  onDelete,
  onOpenFile,
  onCreateTask,
}: {
  messages: ChatMessage[];
  context: ChatContext;
  viewerId: string;
  projects: { id: string; name: string }[];
  onReply: (message: ChatMessage) => void;
  onReact: (messageId: string, emoji: string, add: boolean) => void;
  onEdit: (messageId: string, body: string) => void;
  onDelete: (messageId: string) => void;
  onOpenFile: (attachmentId: string, download: boolean) => void;
  onCreateTask: (message: ChatMessage, projectId: string) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pinnedToBottom = useRef(true);

  /*
    Scroll follows new messages only when the reader is already at the
    bottom. Yanking somebody back down while they are reading history is
    the single most irritating thing a chat window can do.
  */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      pinnedToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (pinnedToBottom.current) bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto px-1">
      <ul className="flex flex-col gap-0.5 py-3">
        {messages.map((message, i) => {
          const previous = messages[i - 1];
          const newDay = !previous || !isSameDay(previous.createdAt, message.createdAt);
          const grouped =
            !newDay &&
            previous?.author.id === message.author.id &&
            new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime() < 5 * 60_000 &&
            !message.replyToId;

          return (
            <li key={message.id}>
              {newDay && (
                <div className="flex items-center gap-3 py-3">
                  <span className="h-px flex-1 bg-border" aria-hidden="true" />
                  <span className="shrink-0 text-caption text-text-muted">
                    {dayLabel(message.createdAt)}
                  </span>
                  <span className="h-px flex-1 bg-border" aria-hidden="true" />
                </div>
              )}

              <div
                className={cn(
                  "group relative flex gap-2.5 rounded-md px-2 py-1 transition-colors hover:bg-white/[0.03]",
                  message.pending && "opacity-60"
                )}
              >
                <div className="w-8 shrink-0">
                  {!grouped ? (
                    <Avatar name={message.author.name} size="sm" />
                  ) : (
                    <span className="block pt-1 text-center text-[10px] tabular text-text-muted opacity-0 transition-opacity group-hover:opacity-100">
                      {timeLabel(message.createdAt)}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  {message.replyTo && (
                    <p className="mb-1 flex min-w-0 items-center gap-1.5 border-l-2 border-border-strong pl-2 text-caption text-text-muted">
                      <CornerUpLeft className="size-3 shrink-0" aria-hidden="true" />
                      <span className="shrink-0 font-medium">{message.replyTo.authorName}</span>
                      <span className="truncate">{message.replyTo.body}</span>
                    </p>
                  )}

                  {!grouped && (
                    <p className="flex items-baseline gap-2">
                      <span className="truncate text-body-sm font-medium text-text-primary">
                        {message.author.name}
                      </span>
                      <span
                        className="shrink-0 text-caption tabular text-text-muted"
                        title={formatExact(message.createdAt)}
                      >
                        {message.pending ? "sending…" : timeLabel(message.createdAt)}
                      </span>
                      {message.edited && (
                        <span className="shrink-0 text-caption text-text-muted">· edited</span>
                      )}
                    </p>
                  )}

                  {editing === message.id ? (
                    <div className="mt-1 flex flex-col gap-2">
                      <Textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") setEditing(null);
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            if (draft.trim()) onEdit(message.id, draft);
                            setEditing(null);
                          }
                        }}
                        aria-label="Edit message"
                        className="min-h-[56px]"
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="xs" onClick={() => setEditing(null)}>
                          Cancel
                        </Button>
                        <Button
                          size="xs"
                          onClick={() => {
                            if (draft.trim()) onEdit(message.id, draft);
                            setEditing(null);
                          }}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <MessageBody
                      body={message.body}
                      mentions={message.mentions}
                      taskRefs={message.taskRefs}
                      projectRefs={message.projectRefs}
                      context={context}
                      viewerId={viewerId}
                    />
                  )}

                  {message.attachments.length > 0 && (
                    <ul className="mt-1.5 flex flex-col gap-1">
                      {message.attachments.map((file) => (
                        <li
                          key={file.id}
                          className="flex max-w-md items-center gap-2 rounded-md border border-border bg-surface-muted px-2 py-1.5"
                        >
                          <Paperclip className="size-3.5 shrink-0 text-text-muted" aria-hidden="true" />
                          <span className="min-w-0 flex-1 truncate text-caption text-text-secondary">
                            {file.name}
                          </span>
                          <span className="shrink-0 text-caption tabular text-text-muted">
                            {formatBytes(file.size)}
                          </span>
                          <IconButton
                            label={`Download ${file.name}`}
                            size="sm"
                            disabled={file.pending}
                            onClick={() => onOpenFile(file.id, true)}
                          >
                            <Download className="size-3.5" />
                          </IconButton>
                        </li>
                      ))}
                    </ul>
                  )}

                  {message.reactions.length > 0 && (
                    <ul className="mt-1.5 flex flex-wrap gap-1">
                      {message.reactions.map((reaction) => (
                        <li key={reaction.emoji}>
                          <button
                            type="button"
                            onClick={() => onReact(message.id, reaction.emoji, !reaction.mine)}
                            className={cn(
                              "flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-caption tabular transition-colors",
                              "focus-visible:outline-none focus-visible:shadow-focus",
                              reaction.mine
                                ? "border-primary/50 bg-primary-muted text-primary"
                                : "border-border bg-surface-muted text-text-secondary hover:border-border-strong"
                            )}
                          >
                            <span aria-hidden="true">{reaction.emoji}</span>
                            {reaction.count}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Actions appear on hover, anchored to the message's top
                    edge so they never cover the text they act on. */}
                {!message.pending && (
                  <div className="absolute -top-3 right-2 flex items-center gap-0.5 rounded-md border border-border bg-surface-elevated p-0.5 opacity-0 shadow-lg transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <IconButton label="Add a reaction" size="sm">
                          <SmilePlus className="size-3.5" />
                        </IconButton>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="flex w-auto gap-0.5 p-1">
                        {REACTION_CHOICES.map((emoji) => {
                          const existing = message.reactions.find((r) => r.emoji === emoji);
                          return (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => onReact(message.id, emoji, !existing?.mine)}
                              aria-label={`React with ${emoji}`}
                              className={cn(
                                "flex size-8 items-center justify-center rounded-md text-base transition-colors",
                                existing?.mine ? "bg-primary-muted" : "hover:bg-white/5"
                              )}
                            >
                              {emoji}
                            </button>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <IconButton label="Reply" size="sm" onClick={() => onReply(message)}>
                      <CornerUpLeft className="size-3.5" />
                    </IconButton>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <IconButton label="Message options" size="sm">
                          <MoreHorizontal className="size-3.5" />
                        </IconButton>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        {projects.length > 0 && (
                          <>
                            <p className="px-2.5 py-1 text-caption text-text-muted">
                              Turn into a task in…
                            </p>
                            {projects.slice(0, 6).map((project) => (
                              <DropdownMenuItem
                                key={project.id}
                                onSelect={() => onCreateTask(message, project.id)}
                              >
                                <ListPlus className="size-4" />
                                <span className="truncate">{project.name}</span>
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                          </>
                        )}
                        {message.mine && (
                          <DropdownMenuItem
                            onSelect={() => {
                              setEditing(message.id);
                              setDraft(message.body);
                            }}
                          >
                            <Pencil className="size-4" />
                            Edit message
                          </DropdownMenuItem>
                        )}
                        {message.canDelete && (
                          <DropdownMenuItem destructive onSelect={() => onDelete(message.id)}>
                            <Trash2 className="size-4" />
                            Delete message
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <div ref={bottomRef} />
    </div>
  );
}
