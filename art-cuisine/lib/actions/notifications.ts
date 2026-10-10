"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { USER_NOTIFICATIONS } from "@/lib/data/operations";
import { getNotificationById } from "@/lib/data/notifications";

type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

function revalidateNotifications(): void {
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/notifications");
}

export async function markNotificationRead(id: string): Promise<ActionResult> {
  const user = await requireSession();

  const notification = getNotificationById(id);
  if (!notification) return { ok: false, error: "Notification introuvable." };
  if (notification.recipientEmail.toLowerCase() !== user.email.toLowerCase()) {
    return { ok: false, error: "Cette notification ne vous appartient pas." };
  }

  notification.read = true;
  notification.readAt = new Date().toISOString();

  revalidateNotifications();
  return { ok: true, data: undefined };
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  const user = await requireSession();
  const now = new Date().toISOString();

  for (const n of USER_NOTIFICATIONS) {
    if (n.recipientEmail.toLowerCase() === user.email.toLowerCase() && !n.read) {
      n.read = true;
      n.readAt = now;
    }
  }

  revalidateNotifications();
  return { ok: true, data: undefined };
}
