"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  AtSign,
  Bell,
  CalendarClock,
  CheckCheck,
  CheckCircle2,
  FolderKanban,
  ListPlus,
  MessageSquare,
  Settings2,
  UserPlus,
  Users,
} from "lucide-react";
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  IconButton,
  toast,
} from "@flow/ui";
import { cn } from "@flow/utils";
import { createClient } from "@/lib/supabase/client";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/actions/notification";
import { formatRelative } from "@/lib/data/task-types";
import type { AppNotification, NotificationKind } from "@/lib/data/notification-types";

const KIND_ICON: Record<NotificationKind, typeof Bell> = {
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

const KIND_TONE: Record<NotificationKind, string> = {
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
  // A request is the only kind that asks the reader to DO something, so
  // it gets the one tone nothing else uses.
  space_join_request: "bg-warning-subtle text-warning",
  space_join_approved: "bg-success-subtle text-success",
  space_join_declined: "bg-surface-elevated text-text-secondary",
};

/**
 * The bell, made real.
 *
 * The button is the one that was already in the top bar — same size,
 * same place, same dot. What changed is that the dot now means
 * something, and the button opens.
 */
export function NotificationCenter() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(async () => {
    const feed = await fetchNotifications();
    setItems(feed.items);
    setUnread(feed.unread);
    setUserId(feed.userId);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /*
    New notifications arrive on their own channel, filtered to this
    person's rows. RLS applies to the subscription too, so the filter is
    a narrowing rather than the boundary — a client asking for somebody
    else's would still receive nothing.
  */
  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();

    const channel = supabase
      .channel(`tyriaq:notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => {
          /*
            The payload carries ids, not the project slug the link needs,
            so the row is re-read on the server rather than assembled
            here from a partial picture. Re-reading is cheap; a
            notification that leads nowhere is not.
          */
          void load();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load, userId]);

  const open = useCallback((notification: AppNotification) => {
    if (!notification.read) {
      setItems((prev) => prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)));
      setUnread((n) => Math.max(0, n - 1));
      void markNotificationRead(notification.id);
    }
  }, []);

  function markAll() {
    startTransition(async () => {
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnread(0);
      const result = await markAllNotificationsRead();
      if (result.error) toast.error(result.error);
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"} className="relative">
          <Bell className="size-[18px]" />
          {unread > 0 && (
            <span
              className={cn(
                "absolute right-1 top-1 flex min-w-[15px] items-center justify-center rounded-full",
                "bg-primary px-1 text-[9px] font-semibold leading-[15px] text-white ring-2 ring-background"
              )}
              aria-hidden="true"
            >
              {unread > 99 ? "99" : unread}
            </span>
          )}
        </IconButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[22rem] p-0">
        <header className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
          <p className="flex items-center gap-2 text-body-sm font-medium text-text-primary">
            Notifications
            {unread > 0 && <Badge variant="primary" size="sm">{unread}</Badge>}
          </p>
          <div className="flex items-center gap-0.5">
            {unread > 0 && (
              <Button variant="ghost" size="xs" onClick={markAll} disabled={pending}>
                <CheckCheck className="size-3.5" />
                Mark all read
              </Button>
            )}
            <Link
              href="/settings/notifications"
              className="flex size-7 items-center justify-center rounded-md text-text-muted transition-colors
                         hover:bg-white/5 hover:text-text-primary focus-visible:outline-none focus-visible:shadow-focus"
              aria-label="Notification preferences"
            >
              <Settings2 className="size-3.5" />
            </Link>
          </div>
        </header>

        {items.length === 0 ? (
          <p className="px-3 py-8 text-center text-body-sm text-text-muted">
            Nothing yet. You will hear about work assigned to you, mentions, and messages.
          </p>
        ) : (
          <ul className="max-h-[26rem] overflow-y-auto">
            {items.map((notification) => {
              const Icon = KIND_ICON[notification.kind] ?? Bell;
              const inner = (
                <>
                  <span
                    className={cn(
                      "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
                      KIND_TONE[notification.kind]
                    )}
                    aria-hidden="true"
                  >
                    <Icon className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block text-body-sm leading-[18px]",
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
                    <span className="mt-0.5 block text-caption tabular text-text-muted">
                      {formatRelative(notification.createdAt)}
                    </span>
                  </span>
                  {!notification.read && (
                    <span
                      className="mt-2 size-1.5 shrink-0 rounded-full bg-primary"
                      aria-label="Unread"
                    />
                  )}
                </>
              );

              const className = cn(
                "flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors",
                "focus-visible:outline-none focus-visible:bg-white/5",
                notification.read ? "hover:bg-white/[0.03]" : "bg-primary/[0.04] hover:bg-primary/[0.07]"
              );

              return (
                <li key={notification.id} className="border-b border-border last:border-b-0">
                  {notification.href ? (
                    <Link href={notification.href} className={className} onClick={() => open(notification)}>
                      {inner}
                    </Link>
                  ) : (
                    // The thing it referred to is gone, or is somewhere
                    // this reader can no longer see. It still says what
                    // happened; it just does not pretend to lead there.
                    <button type="button" className={className} onClick={() => open(notification)}>
                      {inner}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
