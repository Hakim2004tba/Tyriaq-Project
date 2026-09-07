"use client";

import { useMemo, useState } from "react";
import { Hash, MessagesSquare, Plus, Search, Users } from "lucide-react";
import { Avatar, IconButton, Input } from "@flow/ui";
import { cn } from "@flow/utils";
import type { Conversation } from "@/lib/data/chat-types";
import { formatRelative } from "@/lib/data/task-types";

/**
 * The conversation rail.
 *
 * Sorted by most recent activity, with unread threads carrying a count
 * rather than moving to the top — a list that reorders itself while you
 * are reading it makes the row you were aiming at move under the cursor.
 */
export function ConversationList({
  conversations,
  activeId,
  onSelect,
  onNew,
  presentIds,
}: {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  presentIds: Set<string>;
}) {
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.members.some((m) => m.name.toLowerCase().includes(q))
    );
  }, [conversations, query]);

  return (
    <div className="flex w-full shrink-0 flex-col gap-3 lg:w-72">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-muted"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a conversation…"
            aria-label="Find a conversation"
            className="pl-8"
          />
        </div>
        <IconButton label="New conversation" variant="secondary" onClick={onNew}>
          <Plus className="size-4" />
        </IconButton>
      </div>

      {shown.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-3 text-body-sm text-text-muted">
          {query ? "No conversation by that name." : "No conversations yet. Start one with somebody in your workspace."}
        </p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {shown.map((c) => {
            const active = c.id === activeId;
            const online = c.counterpart ? presentIds.has(c.counterpart.id) : false;

            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onSelect(c.id)}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "flex w-full min-w-0 items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors duration-fast",
                    "focus-visible:outline-none focus-visible:shadow-focus",
                    active ? "bg-primary-muted" : "hover:bg-white/[0.04]"
                  )}
                >
                  <span className="relative shrink-0">
                    {c.kind === "dm" && c.counterpart ? (
                      <Avatar name={c.counterpart.name} size="sm" />
                    ) : (
                      <span
                        className={cn(
                          "flex size-8 items-center justify-center rounded-md ring-1 ring-inset ring-border",
                          active ? "bg-surface" : "bg-surface-muted"
                        )}
                        aria-hidden="true"
                      >
                        {c.kind === "project" ? (
                          <Hash className="size-4 text-text-muted" />
                        ) : (
                          <Users className="size-4 text-text-muted" />
                        )}
                      </span>
                    )}
                    {online && (
                      <span
                        className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background bg-success"
                        aria-label="Online"
                      />
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span
                        className={cn(
                          "min-w-0 flex-1 truncate text-body-sm",
                          c.unreadCount > 0 ? "font-medium text-text-primary" : "text-text-secondary",
                          active && "text-text-primary"
                        )}
                      >
                        {c.title}
                      </span>
                      {c.lastMessageAt && (
                        <span className="shrink-0 text-caption tabular text-text-muted">
                          {formatRelative(c.lastMessageAt)}
                        </span>
                      )}
                    </span>
                    {c.lastMessagePreview && (
                      <span className="mt-0.5 block truncate text-caption text-text-muted">
                        {c.lastMessagePreview}
                      </span>
                    )}
                  </span>

                  {c.unreadCount > 0 && (
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular",
                        c.muted ? "bg-surface-elevated text-text-muted" : "bg-primary text-white"
                      )}
                    >
                      {c.unreadCount > 99 ? "99+" : c.unreadCount}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <p className="flex items-center gap-1.5 px-1 text-caption text-text-muted">
        <MessagesSquare className="size-3.5" aria-hidden="true" />
        Mention with @, link a task with #, a project with +
      </p>
    </div>
  );
}
