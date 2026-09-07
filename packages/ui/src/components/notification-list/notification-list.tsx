import * as React from "react";
import { Bell } from "lucide-react";
import type { NotificationWithActor, NotificationFilter } from "@flow/types";
import { NotificationItem } from "../notification-item/notification-item";
import { EmptyState } from "../empty-state/empty-state";
import { Skeleton } from "../skeleton/skeleton";
import { Alert } from "../alert/alert";

export interface NotificationListProps {
  notifications: NotificationWithActor[];
  filter: NotificationFilter;
  loading?: boolean;
  error?: string | null;
  onOpenNotification: (notification: NotificationWithActor) => void;
  onMarkRead: (notification: NotificationWithActor) => void;
}

/**
 * A reusable list of notifications — no data fetching, no server
 * action, no Supabase. `filter` only selects which already-fetched rows
 * to display and which empty-state copy to show; the caller is still
 * the one who fetched `notifications` in the first place.
 */
export function NotificationList({ notifications, filter, loading, error, onOpenNotification, onMarkRead }: NotificationListProps) {
  const visible = React.useMemo(
    () => (filter === "unread" ? notifications.filter((n) => n.readAt === null) : notifications),
    [notifications, filter]
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-2 p-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 px-3 py-2.5">
            <Skeleton className="size-8 rounded-full" />
            <div className="flex-1 flex flex-col gap-1.5">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3">
        <Alert variant="danger">{error}</Alert>
      </div>
    );
  }

  if (visible.length === 0) {
    return (
      <EmptyState
        icon={<Bell className="size-5" />}
        title={filter === "unread" ? "No unread notifications" : "You're all caught up"}
        description={filter === "unread" ? "New notifications will show up here." : "Nothing new to review right now."}
      />
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      {visible.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onOpen={() => onOpenNotification(notification)}
          onMarkRead={notification.readAt === null ? () => onMarkRead(notification) : undefined}
        />
      ))}
    </div>
  );
}
