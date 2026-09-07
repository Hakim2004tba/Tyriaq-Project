"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Hash, MessagesSquare, Search, Users, X } from "lucide-react";
import {
  Avatar,
  AvatarGroup,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  IconButton,
  Input,
  toast,
} from "@flow/ui";
import { cn } from "@flow/utils";
import { createClient } from "@/lib/supabase/client";
import {
  createGroupConversation,
  createTaskFromMessage,
  deleteMessage,
  editMessage,
  joinConversation,
  markConversationRead,
  openDirectMessage,
  recordMessageAttachment,
  searchMessages,
  sendMessage,
  signChatFile,
  toggleReaction,
} from "@/lib/actions/chat";
import type { ChatContext, ChatMessage, Conversation } from "@/lib/data/chat-types";
import { formatRelative, type Person } from "@/lib/data/task-types";
import { Composer } from "./composer";
import { ConversationList } from "./conversation-list";
import { MessageThread } from "./message-thread";

/**
 * Chat.
 *
 * Deliberately built into the workspace shell rather than as a separate
 * application: the same sidebar, the same tokens, and references that
 * resolve to the same tasks and projects the rest of Tyriaq shows.
 */
export function ChatWorkspace({
  conversations: initialConversations,
  activeConversation,
  messages: initialMessages,
  context,
  projects,
  viewer,
  workspaceId,
}: {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: ChatMessage[];
  context: ChatContext;
  projects: { id: string; name: string; slug: string }[];
  viewer: Person;
  workspaceId: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [conversations, setConversations] = useState(initialConversations);
  const [messages, setMessages] = useState(initialMessages);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [present, setPresent] = useState<Set<string>>(() => new Set());
  const [typing, setTyping] = useState<string[]>([]);
  const [composeOpen, setComposeOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => setConversations(initialConversations), [initialConversations]);
  useEffect(() => {
    setMessages(initialMessages);
    setReplyTo(null);
  }, [initialMessages]);

  const activeId = activeConversation?.id ?? null;
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;

  const select = useCallback(
    (id: string) => {
      const qs = new URLSearchParams(params.toString());
      qs.set("c", id);
      router.replace(`${pathname}?${qs.toString()}`, { scroll: false });
    },
    [params, pathname, router]
  );

  /* ---------------------------------------------------------------- */
  /* Live messages                                                     */
  /* ---------------------------------------------------------------- */

  const seen = useRef(new Set<string>());

  useEffect(() => {
    if (!workspaceId) return;
    const supabase = createClient();

    const channel = supabase
      .channel(`tyriaq:chat:${workspaceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `workspace_id=eq.${workspaceId}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const id = (payload.old as { id?: string }).id;
            if (id) setMessages((prev) => prev.filter((m) => m.id !== id));
            return;
          }

          const row = payload.new as {
            id: string; conversation_id: string; author_id: string; body: string;
            created_at: string; edited_at: string | null; reply_to_id: string | null;
            mentions: string[] | null; task_refs: string[] | null; project_refs: string[] | null;
          };

          /*
            A message in another conversation only bumps its unread
            count; there is no thread on screen to append it to, and
            fetching one the reader is not looking at would be work
            nobody asked for.
          */
          if (row.conversation_id !== activeIdRef.current) {
            if (row.author_id === viewer.id) return;
            setConversations((prev) =>
              prev.map((c) =>
                c.id === row.conversation_id
                  ? {
                      ...c,
                      unreadCount: c.unreadCount + (payload.eventType === "INSERT" ? 1 : 0),
                      lastMessageAt: row.created_at,
                      lastMessagePreview: row.body,
                    }
                  : c
              )
            );
            return;
          }

          if (seen.current.has(row.id) && payload.eventType === "INSERT") return;

          const author =
            context.people.find((p) => p.id === row.author_id) ??
            { id: row.author_id, name: "Someone" };

          setMessages((prev) => {
            const existing = prev.findIndex((m) => m.id === row.id);
            const next: ChatMessage = {
              id: row.id,
              conversationId: row.conversation_id,
              author,
              body: row.body,
              createdAt: row.created_at,
              edited: Boolean(row.edited_at),
              mine: row.author_id === viewer.id,
              canDelete: row.author_id === viewer.id,
              replyToId: row.reply_to_id,
              replyTo:
                prev.find((m) => m.id === row.reply_to_id)
                  ? {
                      id: row.reply_to_id!,
                      authorName: prev.find((m) => m.id === row.reply_to_id)!.author.name,
                      body: prev.find((m) => m.id === row.reply_to_id)!.body,
                    }
                  : null,
              mentions: row.mentions ?? [],
              taskRefs: row.task_refs ?? [],
              projectRefs: row.project_refs ?? [],
              reactions: existing === -1 ? [] : prev[existing]!.reactions,
              attachments: existing === -1 ? [] : prev[existing]!.attachments,
            };
            if (existing === -1) return [...prev, next];
            const copy = [...prev];
            copy[existing] = next;
            return copy;
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_reactions", filter: `workspace_id=eq.${workspaceId}` },
        (payload) => {
          const row = (payload.eventType === "DELETE" ? payload.old : payload.new) as {
            message_id?: string; user_id?: string; emoji?: string;
          };
          if (!row.message_id || !row.emoji) return;
          const adding = payload.eventType === "INSERT";
          const mine = row.user_id === viewer.id;
          // Our own toggles are already applied optimistically.
          if (mine) return;

          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== row.message_id) return m;
              return { ...m, reactions: applyReaction(m.reactions, row.emoji!, adding, false) };
            })
          );
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [context.people, viewer.id, workspaceId]);

  /* ---------------------------------------------------------------- */
  /* Presence and typing                                               */
  /* ---------------------------------------------------------------- */

  const typingChannel = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  useEffect(() => {
    if (!workspaceId) return;
    const supabase = createClient();

    /*
      Presence is held in the realtime channel, not in Postgres.

      "Who is online" is true for as long as a socket is open and false
      the instant it closes — writing that to a table would mean a row
      per keystroke and a cleanup problem for every session that ends by
      closing a laptop lid.
    */
    const channel = supabase.channel(`tyriaq:presence:${workspaceId}`, {
      config: { presence: { key: viewer.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        setPresent(new Set(Object.keys(channel.presenceState())));
      })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const { userId, conversationId } = payload as { userId: string; conversationId: string };
        if (userId === viewer.id || conversationId !== activeIdRef.current) return;
        setTyping((prev) => (prev.includes(userId) ? prev : [...prev, userId]));
        // Typing has no "stopped" event; it simply expires.
        setTimeout(() => setTyping((prev) => prev.filter((id) => id !== userId)), 3000);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void channel.track({ at: Date.now() });
      });

    typingChannel.current = channel;
    return () => {
      typingChannel.current = null;
      void supabase.removeChannel(channel);
    };
  }, [viewer.id, workspaceId]);

  const announceTyping = useRef(0);
  const onTyping = useCallback(() => {
    const now = Date.now();
    // At most one broadcast every two seconds — this fires per keystroke.
    if (now - announceTyping.current < 2000 || !activeIdRef.current) return;
    announceTyping.current = now;
    void typingChannel.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { userId: viewer.id, conversationId: activeIdRef.current },
    });
  }, [viewer.id]);

  /* ---------------------------------------------------------------- */
  /* Reading                                                           */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (!activeId) return;
    setConversations((prev) =>
      prev.map((c) => (c.id === activeId ? { ...c, unreadCount: 0 } : c))
    );
    void markConversationRead(activeId);
  }, [activeId, messages.length]);

  /* ---------------------------------------------------------------- */
  /* Sending                                                           */
  /* ---------------------------------------------------------------- */

  const onSend = useCallback(
    async (input: {
      body: string;
      mentions: string[];
      taskRefs: string[];
      projectRefs: string[];
      files: File[];
    }) => {
      if (!activeId) return;
      const tempId = `pending-${Math.random().toString(36).slice(2)}`;
      const optimistic: ChatMessage = {
        id: tempId,
        conversationId: activeId,
        author: viewer,
        body: input.body,
        createdAt: new Date().toISOString(),
        edited: false,
        mine: true,
        canDelete: true,
        replyToId: replyTo?.id ?? null,
        replyTo: replyTo
          ? { id: replyTo.id, authorName: replyTo.author.name, body: replyTo.body }
          : null,
        mentions: input.mentions,
        taskRefs: input.taskRefs,
        projectRefs: input.projectRefs,
        reactions: [],
        attachments: input.files.map((file, i) => ({
          id: `${tempId}-f${i}`,
          name: file.name,
          size: file.size,
          mimeType: file.type,
          storagePath: "",
          canRemove: true,
          pending: true,
        })),
        pending: true,
      };

      setMessages((prev) => [...prev, optimistic]);
      setReplyTo(null);

      const result = await sendMessage({
        conversationId: activeId,
        body: input.body,
        replyToId: optimistic.replyToId,
        mentions: input.mentions,
        taskRefs: input.taskRefs,
        projectRefs: input.projectRefs,
      });

      if (result.error || !result.id) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        toast.error(result.error ?? "Could not send that message.");
        return;
      }

      const realId = result.id;
      seen.current.add(realId);
      setMessages((prev) =>
        dedupe(
          prev.map((m) =>
            m.id === tempId
              ? { ...m, id: realId, pending: false, createdAt: result.createdAt ?? m.createdAt }
              : m
          )
        )
      );

      // Files follow the message, since an attachment needs its id.
      if (input.files.length > 0) {
        const supabase = createClient();
        for (const file of input.files) {
          const extension = file.name.includes(".") ? `.${file.name.split(".").pop()!.slice(0, 12)}` : "";
          const path = `${workspaceId}/${activeId}/${crypto.randomUUID()}${extension}`;
          const { error } = await supabase.storage.from("chat-files").upload(path, file, {
            contentType: file.type || "application/octet-stream",
            upsert: false,
          });
          if (error) {
            toast.error(`${file.name}: ${error.message}`);
            continue;
          }
          const recorded = await recordMessageAttachment({
            messageId: realId,
            storagePath: path,
            fileName: file.name,
            mimeType: file.type || "application/octet-stream",
            sizeBytes: file.size,
          });
          if (recorded.error) {
            await supabase.storage.from("chat-files").remove([path]);
            toast.error(recorded.error);
          }
        }
        router.refresh();
      }
    },
    [activeId, replyTo, router, viewer, workspaceId]
  );

  const onReact = useCallback((messageId: string, emoji: string, add: boolean) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, reactions: applyReaction(m.reactions, emoji, add, true) } : m))
    );
    void toggleReaction(messageId, emoji, add).then((result) => {
      if (result.error) toast.error(result.error);
    });
  }, []);

  const onEditMessage = useCallback((messageId: string, body: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, body, edited: true } : m))
    );
    void editMessage(messageId, body).then((r) => r.error && toast.error(r.error));
  }, []);

  const onDeleteMessage = useCallback((messageId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    void deleteMessage(messageId).then((r) => r.error && toast.error(r.error));
  }, []);

  const onOpenFile = useCallback((attachmentId: string, download: boolean) => {
    void signChatFile(attachmentId, download).then((result) => {
      if (result.error || !result.url) {
        toast.error(result.error ?? "Could not open that file.");
        return;
      }
      window.location.href = result.url;
    });
  }, []);

  const onCreateTask = useCallback(
    (message: ChatMessage, projectId: string) => {
      startTransition(async () => {
        const result = await createTaskFromMessage(message.id, projectId);
        if (result.error) toast.error(result.error);
        else toast.success(result.message ?? "Task created.");
        router.refresh();
      });
    },
    [router]
  );

  const typingNames = useMemo(
    () =>
      typing
        .map((id) => context.people.find((p) => p.id === id)?.name)
        .filter((name): name is string => Boolean(name)),
    [context.people, typing]
  );

  const canPost = activeConversation?.joined ?? false;

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-h1 text-text-primary">Chat</h1>
          <p className="mt-1 text-body text-text-secondary">
            Direct messages, groups and project channels — with the same tasks and projects as the rest of Tyriaq.
          </p>
        </div>
        <Button variant="secondary" size="md" onClick={() => setSearchOpen(true)}>
          <Search className="size-4" />
          Search messages
        </Button>
      </header>

      <div className="flex min-h-[32rem] flex-col gap-6 lg:h-[calc(100vh-16rem)] lg:flex-row">
        <ConversationList
          conversations={conversations}
          activeId={activeId}
          onSelect={select}
          onNew={() => setComposeOpen(true)}
          presentIds={present}
        />

        <section className="flex min-h-0 min-w-0 flex-1 flex-col rounded-lg border border-border bg-surface">
          {!activeConversation ? (
            <div className="flex flex-1 items-center justify-center p-6">
              <EmptyState
                icon={<MessagesSquare className="size-5" />}
                title="No conversation open"
                description="Pick one on the left, or start a new direct message or group."
                action={<Button size="sm" onClick={() => setComposeOpen(true)}>New conversation</Button>}
              />
            </div>
          ) : (
            <>
              <header className="flex shrink-0 items-center gap-3 border-b border-border px-3 py-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-muted ring-1 ring-inset ring-border">
                  {activeConversation.kind === "project" ? (
                    <Hash className="size-4 text-text-muted" />
                  ) : activeConversation.kind === "group" ? (
                    <Users className="size-4 text-text-muted" />
                  ) : (
                    <Avatar name={activeConversation.title} size="xs" />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2">
                    <span className="truncate text-body font-medium text-text-primary">
                      {activeConversation.title}
                    </span>
                    {activeConversation.kind === "project" && activeConversation.projectSlug && (
                      <Link
                        href={`/projects/${activeConversation.projectSlug}`}
                        className="shrink-0 text-caption text-primary hover:underline"
                      >
                        Open project
                      </Link>
                    )}
                    {!activeConversation.joined && <Badge variant="neutral" size="sm">Not joined</Badge>}
                  </p>
                  <p className="truncate text-caption text-text-muted">
                    {typingNames.length > 0
                      ? `${typingNames.join(", ")} ${typingNames.length === 1 ? "is" : "are"} typing…`
                      : activeConversation.kind === "dm"
                        ? present.has(activeConversation.counterpart?.id ?? "")
                          ? "Online"
                          : "Offline"
                        : `${activeConversation.members.length} ${activeConversation.members.length === 1 ? "person" : "people"}`}
                  </p>
                </div>

                {activeConversation.kind !== "dm" && (
                  <AvatarGroup
                    people={activeConversation.members.map((m) => ({ id: m.id, name: m.name }))}
                    max={4}
                    size="sm"
                  />
                )}
              </header>

              <MessageThread
                messages={messages}
                context={context}
                viewerId={viewer.id}
                projects={projects}
                onReply={setReplyTo}
                onReact={onReact}
                onEdit={onEditMessage}
                onDelete={onDeleteMessage}
                onOpenFile={onOpenFile}
                onCreateTask={onCreateTask}
              />

              {canPost ? (
                <div onKeyDown={onTyping}>
                  <Composer
                    context={context}
                    replyTo={replyTo}
                    onCancelReply={() => setReplyTo(null)}
                    onSend={onSend}
                    disabled={pending}
                  />
                </div>
              ) : (
                <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-3 py-3">
                  <p className="min-w-0 text-body-sm text-text-secondary">
                    You can read this channel. Join it to post.
                  </p>
                  <Button
                    size="sm"
                    onClick={() =>
                      startTransition(async () => {
                        const result = await joinConversation(activeConversation.id);
                        if (result.error) toast.error(result.error);
                        else router.refresh();
                      })
                    }
                  >
                    Join channel
                  </Button>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <NewConversationDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        people={context.people.filter((p) => p.id !== viewer.id)}
        onOpened={(id) => {
          setComposeOpen(false);
          select(id);
          router.refresh();
        }}
      />

      <SearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        conversations={conversations}
        onOpenMessage={(conversationId) => {
          setSearchOpen(false);
          select(conversationId);
        }}
      />
    </div>
  );
}

/** Local mirror of a reaction toggle, so the chip moves under the cursor. */
function applyReaction(
  reactions: ChatMessage["reactions"],
  emoji: string,
  add: boolean,
  mine: boolean
): ChatMessage["reactions"] {
  const existing = reactions.find((r) => r.emoji === emoji);
  if (add) {
    if (!existing) return [...reactions, { emoji, count: 1, mine }];
    return reactions.map((r) =>
      r.emoji === emoji ? { ...r, count: r.count + 1, mine: mine || r.mine } : r
    );
  }
  if (!existing) return reactions;
  if (existing.count <= 1) return reactions.filter((r) => r.emoji !== emoji);
  return reactions.map((r) =>
    r.emoji === emoji ? { ...r, count: r.count - 1, mine: mine ? false : r.mine } : r
  );
}

function dedupe<T extends { id: string }>(rows: T[]): T[] {
  const seenIds = new Set<string>();
  return rows.filter((row) => {
    if (seenIds.has(row.id)) return false;
    seenIds.add(row.id);
    return true;
  });
}

function NewConversationDialog({
  open,
  onOpenChange,
  people,
  onOpened,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  people: Person[];
  onOpened: (conversationId: string) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();

  const isGroup = selected.size > 1;

  function submit() {
    startTransition(async () => {
      const ids = Array.from(selected);
      if (ids.length === 0) return;

      // One person is a DM; more than one is a group. Making the user
      // choose between two buttons for the same intent is a question the
      // selection has already answered.
      const result = isGroup
        ? await createGroupConversation(title || `${ids.length + 1} people`, ids)
        : await openDirectMessage(ids[0]!);

      if (result.error || !result.id) {
        toast.error(result.error ?? "Could not start that conversation.");
        return;
      }
      setSelected(new Set());
      setTitle("");
      onOpened(result.id);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New conversation</DialogTitle>
          <DialogDescription>
            Pick one person for a direct message, or several for a group.
          </DialogDescription>
        </DialogHeader>

        {people.length === 0 ? (
          <p className="text-body-sm text-text-muted">
            You are the only person in this workspace. Chat needs somebody to talk to — invite a
            colleague first.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {isGroup && (
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Name this group"
                aria-label="Group name"
              />
            )}
            <ul className="max-h-64 overflow-y-auto rounded-md border border-border">
              {people.map((person) => {
                const on = selected.has(person.id);
                return (
                  <li key={person.id}>
                    <button
                      type="button"
                      onClick={() =>
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (next.has(person.id)) next.delete(person.id);
                          else next.add(person.id);
                          return next;
                        })
                      }
                      className={cn(
                        "flex w-full items-center gap-2 px-2.5 py-2 text-left text-body-sm transition-colors",
                        on ? "bg-primary-muted text-primary" : "text-text-secondary hover:bg-white/5"
                      )}
                    >
                      <Avatar name={person.name} size="xs" />
                      <span className="min-w-0 flex-1 truncate">{person.name}</span>
                      {on && <span className="shrink-0 text-caption">Selected</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} loading={pending} disabled={selected.size === 0}>
            {isGroup ? "Create group" : "Open conversation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SearchDialog({
  open,
  onOpenChange,
  conversations,
  onOpenMessage,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversations: Conversation[];
  onOpenMessage: (conversationId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<
    { id: string; conversationId: string; body: string; createdAt: string; authorName: string }[]
  >([]);
  const [searching, setSearching] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onQuery(value: string) {
    setQuery(value);
    if (timer.current) clearTimeout(timer.current);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    // Searching per keystroke would send a query per character; a short
    // pause is what somebody typing a word actually means by "search".
    setSearching(true);
    timer.current = setTimeout(async () => {
      const result = await searchMessages(value);
      setResults(result.results);
      setSearching(false);
      if (result.error) toast.error(result.error);
    }, 250);
  }

  const titleOf = (id: string) => conversations.find((c) => c.id === id)?.title ?? "Conversation";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Search messages</DialogTitle>
          <DialogDescription>
            Across every conversation you are part of. Quoted &ldquo;phrases&rdquo; and -exclusions work.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-muted"
            aria-hidden="true"
          />
          <Input
            autoFocus
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search…"
            aria-label="Search messages"
            className="pl-8"
          />
          {query && (
            <IconButton
              label="Clear search"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2"
              onClick={() => onQuery("")}
            >
              <X className="size-3.5" />
            </IconButton>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {query.trim().length < 2 ? (
            <p className="py-6 text-center text-body-sm text-text-muted">Type at least two characters.</p>
          ) : searching ? (
            <p className="py-6 text-center text-body-sm text-text-muted">Searching…</p>
          ) : results.length === 0 ? (
            <p className="py-6 text-center text-body-sm text-text-muted">No message matches that.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {results.map((result) => (
                <li key={result.id}>
                  <button
                    type="button"
                    onClick={() => onOpenMessage(result.conversationId)}
                    className="flex w-full flex-col gap-0.5 px-1 py-2 text-left transition-colors hover:bg-white/5
                               focus-visible:outline-none focus-visible:shadow-focus"
                  >
                    <span className="flex items-baseline gap-2">
                      <span className="truncate text-body-sm font-medium text-text-primary">
                        {result.authorName}
                      </span>
                      <span className="shrink-0 text-caption text-text-muted">
                        in {titleOf(result.conversationId)} · {formatRelative(result.createdAt)}
                      </span>
                    </span>
                    <span className="line-clamp-2 text-body-sm text-text-secondary">{result.body}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
