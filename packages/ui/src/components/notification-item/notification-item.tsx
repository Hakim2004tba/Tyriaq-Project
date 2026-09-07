import * as React from "react";
import type { NotificationWithActor } from "@flow/types";
import { formatRelativeTime, cn } from "@flow/utils";
import { Avatar } from "../avatar/avatar";
import { formatNotification } from "./format-notification";

export interface NotificationItemProps {
  notification: NotificationWithActor;
  onOpen: () => void;
  /** Omit to hide the mark-read affordance entirely (e.g. it's already read). */
  onMarkRead?: () => void;
}

/**
 * A single notification row. Purely presentational: everything it needs
 * arrives as props, and every interaction is a callback the caller
 * supplies — no Supabase, no server action, no routing decision baked
 * in here (the caller's onOpen already knows where to navigate).
 */
export function NotificationItem({ notification, onOpen, onMarkRead }: NotificationItemProps) {
  const isUnread = notification.readAt === null;
  const actorName = notification.actor?.fullName || "Someone";
  const { icon, title, description } = formatNotification(notification.type, notification.metadata, actorName);

  return (
    <div
      className={cn(
        "flex w-full items-start gap-3 rounded-md px-3 py-2.5 transition-colors",
        isUnread && "bg-primary-subtle"
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-start gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
      >
        <span className="relative shrink-0">
          <Avatar name={actorName} src={notification.actor?.avatarUrl} size="sm" />
          <span className="absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-surface text-text-secondary">
            {icon}
          </span>
        </span>

        <span className="min-w-0 flex-1">
          <span className={cn("block text-body-sm text-text-primary", isUnread && "font-semibold")}>{title}</span>
          {description && <span className="block truncate text-body-sm text-text-secondary">{description}</span>}
          <span className="mt-0.5 block text-caption text-text-muted">{formatRelativeTime(notification.createdAt)}</span>
        </span>
      </button>

      {/* Unread is communicated by the bold title text above AND this
       * dot — never color alone. Sibling to the open-button (not
       * nested inside it) to avoid an interactive element inside
       * another interactive element. */}
      {isUnread && (
        <div className="flex shrink-0 flex-col items-end gap-1.5 pt-1">
          <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
          <span className="sr-only">Unread</span>
          {onMarkRead && (
            <button
              type="button"
              onClick={onMarkRead}
              className="text-caption font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
            >
              Mark read
            </button>
          )}
        </div>
      )}
    </div>
  );
}
