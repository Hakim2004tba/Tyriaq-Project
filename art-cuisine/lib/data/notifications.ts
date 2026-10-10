import { USER_NOTIFICATIONS, type UserNotificationRecord } from "@/lib/data/operations";

export function getNotificationsForUser(email: string): UserNotificationRecord[] {
  const target = email.toLowerCase();
  return USER_NOTIFICATIONS.filter((n) => n.recipientEmail.toLowerCase() === target).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function getUnreadNotificationCount(email: string): number {
  const target = email.toLowerCase();
  return USER_NOTIFICATIONS.filter((n) => n.recipientEmail.toLowerCase() === target && !n.read).length;
}

export function getNotificationById(id: string): UserNotificationRecord | undefined {
  return USER_NOTIFICATIONS.find((n) => n.id === id);
}
