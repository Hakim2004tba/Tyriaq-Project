import * as React from "react";
import { Bell } from "lucide-react";
import { cn } from "@flow/utils";

export interface NotificationBellProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  unreadCount: number;
}

/**
 * The TopBar entry point. Purely a trigger — it never fetches the
 * unread count itself; the caller (Web integration) supplies it, most
 * likely from a lightweight count query rather than the full
 * notification list (brief Part 20).
 */
export const NotificationBell = React.forwardRef<HTMLButtonElement, NotificationBellProps>(
  ({ unreadCount, className, ...props }, ref) => {
    const hasUnread = unreadCount > 0;
    const label = hasUnread
      ? `Notifications, ${unreadCount} unread`
      : "Notifications";

    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        className={cn(
          "relative flex size-9 items-center justify-center rounded-md text-text-secondary transition-colors",
          "hover:bg-surface-muted hover:text-text-primary",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          className
        )}
        {...props}
      >
        <Bell className="size-4" aria-hidden="true" />
        {hasUnread && (
          <span
            aria-hidden="true"
            className="absolute right-1.5 top-1.5 flex min-w-[16px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold leading-none text-[#2A0810]"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
    );
  }
);
NotificationBell.displayName = "NotificationBell";
