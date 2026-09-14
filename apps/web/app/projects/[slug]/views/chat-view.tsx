"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { MessageSquare, Users } from "lucide-react";
import { Button, toast } from "@flow/ui";
import { MessageThread } from "@/components/chat/message-thread";
import { Composer } from "@/components/chat/composer";
import { createClient } from "@/lib/supabase/client";
import {
  createTaskFromMessage,
  deleteMessage,
  editMessage,
  joinConversation,
  loadProjectChannel,
  markConversationRead,
  recordMessageAttachment,
  sendMessage,
  signChatFile,
  toggleReaction,
} from "@/lib/actions/chat";
import { applyReaction, type ChatContext, type ChatMessage } from "@/lib/data/chat-types";
import { useTasks } from "@/components/tasks/task-store";
import type { Person } from "@/lib/data/task-types";
import type { Project } from "@/lib/data/types";

/**
 * The project's conversation, inside the project.
 *
 * Chat about a project has always happened somewhere — a group thread
 * nobody can find later, a DM that leaves everyone else out. Putting it
 * behind the same tab strip as List and Board makes it part of the work
 * rather than a place you go instead of working, and it inherits the
 * project's context for free: `#` in the composer offers this project's
 * tasks, and any message can become one.
 *
 * The channel is loaded on first open rather than with the page. Most
 * visits to a project are to look at tasks, and paying for a message
 * history on every one of them would slow down the common case to
 * serve the rarer one.
 */
export function ChatView({
  project,
  people,
  viewer,
  onOpenTask,
}: {
  project: Project;
  people: Person[];
  viewer: Person;
  onOpenTask: (id: string) => void;
}) {
  const store = useTasks();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [, startTransition] = useTransition();
  const loaded = useRef(false);

  /*
    The composer's pickers are the PROJECT's, not the workspace's: `#`
    offers the tasks on this board, and `+` offers this project. Somebody
    talking in a project channel is almost never referring to a task on a
    different board, and a picker listing every task in the workspace
    makes the one they want harder to find.
  */
  const context: ChatContext = {
    people,
    tasks: store.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      projectSlug: project.slug,
    })),
    projects: [{ id: project.id, name: project.name, slug: project.slug }],
  };

  const load = useCallback(async () => {
    const result = await loadProjectChannel(project.id);
    if (result.error) {
      toast.error(result.error);
      setLoading(false);
      return;
    }
    setConversationId(result.conversationId ?? null);
    setMessages(result.messages ?? []);
    setJoined(Boolean(result.joined));
    setLoading(false);

    // Opening the tab is reading it; the unread count should not survive
    // having looked at the messages.
    if (result.conversationId) void markConversationRead(result.conversationId);
  }, [project.id]);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    void load();
  }, [load]);

  const send = useCallback(
    async (input: {
      body: string;
      mentions: string[];
      taskRefs: string[];
      projectRefs: string[];
      files: File[];
    }) => {
      if (!conversationId) return;

      // Optimistic, like the main chat: the line appears as you send it
      // and is reconciled when the id comes back.
      const tempId = `pending-${crypto.randomUUID()}`;
      const optimistic: ChatMessage = {
        id: tempId,
        conversationId,
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
        attachments: [],
        pending: true,
      };
      setMessages((prev) => [...prev, optimistic]);
      setReplyTo(null);

      const result = await sendMessage({
        conversationId,
        body: input.body,
        replyToId: optimistic.replyToId,
        mentions: input.mentions,
        taskRefs: input.taskRefs,
        projectRefs: input.projectRefs,
      });

      if (result.error || !result.id) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        toast.error(result.error ?? "Could not send that.");
        return;
      }

      const realId = result.id;
      setJoined(true);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? { ...m, id: realId, pending: false, createdAt: result.createdAt ?? m.createdAt }
            : m
        )
      );

      /*
        Straight from the browser into the bucket, as everywhere else: a
        Server Action accepts one megabyte of body, and the limit on an
        attachment is 25 MB.
      */
      const supabase = createClient();
      for (const file of input.files) {
        const extension = file.name.includes(".")
          ? `.${file.name.split(".").pop()!.slice(0, 12)}`
          : "";
        const path = `${project.workspaceId}/${conversationId}/${crypto.randomUUID()}${extension}`;
        const { error: uploadError } = await supabase.storage.from("chat-files").upload(path, file, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });
        if (uploadError) {
          toast.error(`${file.name}: ${uploadError.message}`);
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
      if (input.files.length > 0) void load();
    },
    [conversationId, load, project.workspaceId, replyTo, viewer]
  );

  const react = useCallback((messageId: string, emoji: string, add: boolean) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, reactions: applyReaction(m.reactions, emoji, add, true) } : m
      )
    );
    startTransition(async () => {
      const result = await toggleReaction(messageId, emoji, add);
      if (result.error) toast.error(result.error);
    });
  }, []);

  const edit = useCallback((messageId: string, body: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, body, edited: true } : m))
    );
    startTransition(async () => {
      const result = await editMessage(messageId, body);
      if (result.error) toast.error(result.error);
    });
  }, []);

  const remove = useCallback((messageId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    startTransition(async () => {
      const result = await deleteMessage(messageId);
      if (result.error) toast.error(result.error);
    });
  }, []);

  const openFile = useCallback((attachmentId: string, download: boolean) => {
    void signChatFile(attachmentId, download).then((result) => {
      if (result.url) window.open(result.url, "_blank", "noopener,noreferrer");
      else toast.error(result.error ?? "Could not open that file.");
    });
  }, []);

  /*
    "Make this a task" lands on THIS project without asking which one.

    In the standalone chat that is a question worth asking, because a
    message could be about anything. Here the answer is on the screen
    already — and the new task opens straight away, because the next
    thing anybody does with a task made from a sentence is describe it
    properly.
  */
  const makeTask = useCallback(
    (message: ChatMessage) => {
      startTransition(async () => {
        const result = await createTaskFromMessage(message.id, project.id);
        if (result.error || !result.taskId) {
          toast.error(result.error ?? "Could not make a task.");
          return;
        }
        toast.success("Task created.");
        onOpenTask(result.taskId);
      });
    },
    [onOpenTask, project.id]
  );

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-border bg-surface">
        <p className="text-body-sm text-text-muted">Opening the channel…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[480px] flex-col overflow-hidden rounded-lg border border-border bg-surface">
      <header className="flex items-center gap-2.5 border-b border-border px-4 py-2.5">
        <span className="flex size-8 items-center justify-center rounded-md bg-primary-muted text-primary">
          <MessageSquare className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-body-sm font-medium text-text-primary">
            {project.name}
          </p>
          <p className="truncate text-caption text-text-muted">
            Everyone in the workspace can read this channel
          </p>
        </div>
        {!joined && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              if (!conversationId) return;
              startTransition(async () => {
                const result = await joinConversation(conversationId);
                if (result.error) toast.error(result.error);
                else setJoined(true);
              });
            }}
          >
            <Users className="size-3.5" />
            Join
          </Button>
        )}
      </header>

      <MessageThread
        messages={messages}
        context={context}
        viewerId={viewer.id}
        projects={[{ id: project.id, name: project.name }]}
        onReply={setReplyTo}
        onReact={react}
        onEdit={edit}
        onDelete={remove}
        onOpenFile={openFile}
        onCreateTask={(message) => makeTask(message)}
      />

      <div className="border-t border-border px-3 py-2.5">
        <Composer
          context={context}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          onSend={(input) => void send(input)}
          placeholder={`Message ${project.name}… (@ mention, # task)`}
        />
      </div>
    </div>
  );
}
