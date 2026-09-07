import * as React from "react";
import type { NotificationWithActor, NotificationFilter } from "@flow/types";
import { Tabs, TabsList, TabsTrigger } from "../tabs/tabs";
import { Button } from "../button/button";
import { NotificationList } from "../notification-list/notification-list";

export interface NotificationPanelProps {
  notifications: NotificationWithActor[];
  filter: NotificationFilter;
  onFilterChange: (filter: NotificationFilter) => void;
  loading?: boolean;
  error?: string | null;
  unreadCount: number;
  onOpenNotification: (notification: NotificationWithActor) => void;
  onMarkRead: (notification: NotificationWithActor) => void;
  onMarkAllRead: () => void;
  onViewAll?: () => void;
  /** Hides the "View all" footer — used when this panel already IS the
   * full Inbox page (brief: NotificationPanel must stay reusable across
   * the compact TopBar popover and the full page, not forked in two). */
  showFooter?: boolean;
  className?: string;
}

/**
 * The notification panel's content — header (title + "Mark all as
 * read"), All/Unread tabs, the list, and a "View all" footer link. This
 * is deliberately just content: it doesn't render a Dialog/Sheet/
 * DropdownMenu around itself, so the app can drop it into whichever
 * existing overlay fits the integration point (a TopBar dropdown on
 * desktop, a Sheet on narrower viewports, a dedicated Mobile screen) —
 * no new overlay primitive was added here.
 */
export function NotificationPanel({
  notifications,
  filter,
  onFilterChange,
  loading,
  error,
  unreadCount,
  onOpenNotification,
  onMarkRead,
  onMarkAllRead,
  onViewAll,
  showFooter = true,
  className,
}: NotificationPanelProps) {
  return (
    <div className={className}>
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <span className="text-label text-text-primary">Notifications</span>
        <Button variant="ghost" size="sm" onClick={onMarkAllRead} disabled={unreadCount === 0}>
          Mark all as read
        </Button>
      </div>

      <div className="px-3 pt-2">
        <Tabs value={filter} onValueChange={(v) => onFilterChange(v as NotificationFilter)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">Unread{unreadCount > 0 ? ` (${unreadCount})` : ""}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="max-h-96 overflow-y-auto p-1">
        <NotificationList
          notifications={notifications}
          filter={filter}
          loading={loading}
          error={error}
          onOpenNotification={onOpenNotification}
          onMarkRead={onMarkRead}
        />
      </div>

      {showFooter && onViewAll && (
        <div className="border-t border-border p-2">
          <Button variant="ghost" size="sm" onClick={onViewAll} className="w-full justify-center">
            View all
          </Button>
        </div>
      )}
    </div>
  );
}
