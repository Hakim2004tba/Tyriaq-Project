import { Bell } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { getNotificationsForUser } from "@/lib/data/notifications";
import { Card } from "@/components/ui/card";
import { NotificationsList } from "@/components/dashboard/notifications/notifications-list";
import { MarkAllReadButton } from "@/components/dashboard/notifications/mark-all-read-button";

export default async function NotificationsPage() {
  const user = await requirePermission("dashboard.view");
  const notifications = getNotificationsForUser(user.email);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-medium text-text-primary sm:text-3xl">Notifications</h1>
          <p className="mt-1 text-sm text-text-muted">
            {unreadCount > 0 ? `${unreadCount} notification${unreadCount > 1 ? "s" : ""} non lue${unreadCount > 1 ? "s" : ""}` : "Vous êtes à jour."}
          </p>
        </div>
        {unreadCount > 0 && <MarkAllReadButton />}
      </div>

      {notifications.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-16 text-center">
          <Bell className="h-8 w-8 text-text-muted" />
          <p className="text-sm text-text-muted">Aucune notification pour le moment.</p>
        </Card>
      ) : (
        <NotificationsList notifications={notifications} />
      )}
    </div>
  );
}
