"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  AtSign,
  BellOff,
  CalendarClock,
  CheckCheck,
  CheckCircle2,
  FolderKanban,
  ListPlus,
  MessageSquare,
  UserPlus,
  Users,
} from "lucide-react";
import { Button, EmptyState, toast } from "@flow/ui";
import { cn } from "@flow/utils";
import { formatRelative } from "@/lib/data/task-types";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/actions/notification";
import type { AppNotification, NotificationKind } from "@/lib/data/notification-types";

const ICON: Record<NotificationKind, typeof AtSign> = {
  task_assigned: ListPlus,
  task_mentioned: AtSign,
  comment_mention: AtSign,
  task_status: CheckCircle2,
  task_completed: CheckCircle2,
  due_soon: CalendarClock,
  task_overdue: CalendarClock,
  project_added: FolderKanban,
  workspace_added: Users,
  message_received: MessageSquare,
  space_join_request: UserPlus,
  space_join_approved: Users,
  space_join_declined: Users,
};

const TONE: Record<NotificationKind, string> = {
  task_assigned: "bg-primary-muted text-primary",
  task_mentioned: "bg-primary-muted text-primary",
  comment_mention: "bg-info-subtle text-info",
  task_status: "bg-surface-elevated text-text-secondary",
  task_completed: "bg-success-subtle text-success",
  due_soon: "bg-warning-subtle text-warning",
  task_overdue: "bg-danger-subtle text-danger",
  project_added: "bg-surface-elevated text-text-secondary",
  workspace_added: "bg-surface-elevated text-text-secondary",
  message_received: "bg-info-subtle text-info",
  space_join_request: "bg-warning-subtle text-warning",
  space_join_approved: "bg-success-subtle text-success",
  space_join_declined: "bg-surface-elevated text-text-secondary",
};

/**
 * The feed, with reading tracked as you go.
 *
 * Opening one marks it read optimistically rather than waiting for the
 * server: the click is already taking you somewhere else, and a row that
 * stays bold behind you reads as the click not having worked.
 */
export function InboxList({
  items,
  unread,
}: {
  items: AppNotification[];
  unread: number;
}) {
  const [rows, setRows] = useState(items);
  const [count, setCount] = useState(unread);
  const [pending, startTransition] = useTransition();

  function open(notification: AppNotification) {
    if (notification.read) return;
    setRows((current) =>
      current.map((row) => (row.id === notification.id ? { ...row, read: true } : row))
    );
    setCount((current) => Math.max(0, current - 1));
    void markNotificationRead(notification.id);
  }

  function markAll() {
    const previous = rows;
    setRows((current) => current.map((row) => ({ ...row, read: true })));
    setCount(0);
    startTransition(async () => {
      const result = await markAllNotificationsRead();
      if (result.error) {
        setRows(previous);
        setCount(unread);
        toast.error(result.error);
      }
    });
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<BellOff className="size-5" />}
        title="Nothing yet"
        description="Mentions, assignments, due dates and requests to join a space all land here."
      />
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {count > 0 && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" loading={pending} onClick={markAll}>
            <CheckCheck className="size-4" />
            Mark all read
          </Button>
        </div>
      )}

      <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
        {rows.map((notification) => {
          const Icon = ICON[notification.kind];
          const body = (
            <>
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full",
                  TONE[notification.kind]
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block text-body-sm",
                    notification.read ? "text-text-secondary" : "font-medium text-text-primary"
                  )}
                >
                  {notification.title}
                </span>
                {notification.body && (
                  <span className="mt-0.5 block truncate text-caption text-text-muted">
                    {notification.body}
                  </span>
                )}
                <span className="mt-0.5 block text-caption text-text-muted">
                  {formatRelative(notification.createdAt)}
                </span>
              </span>
              {!notification.read && (
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />
              )}
            </>
          );

          return (
            <li key={notification.id}>
              {/*
                A notification whose target is gone renders as text rather
                than a link. Clicking through to a 404 is worse than not
                being able to click.
              */}
              {notification.href ? (
                <Link
                  href={notification.href}
                  onClick={() => open(notification)}
                  className="flex items-start gap-2.5 px-3 py-2.5 transition-colors
                             hover:bg-white/[0.04] focus-visible:outline-none focus-visible:bg-white/5"
                >
                  {body}
                </Link>
              ) : (
                <div className="flex items-start gap-2.5 px-3 py-2.5">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
