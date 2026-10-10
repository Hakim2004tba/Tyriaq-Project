import { randomUUID } from "node:crypto";
import { USER_NOTIFICATIONS, type NotificationType } from "@/lib/data/operations";
import { listUsers } from "@/lib/auth/queries";

interface NotifyInput {
  type: NotificationType;
  title: string;
  description: string;
  link?: string | null;
}

/**
 * The shared emission point for every notification in the app — imported
 * (not called directly from the client) by Server Actions across leads,
 * clients, devis, design, production, vernissage, montage, finance, SAV and
 * messaging, right after they persist the event the notification describes.
 */
export function notifyEmail(email: string, input: NotifyInput): void {
  USER_NOTIFICATIONS.unshift({
    id: `NTF-${randomUUID().slice(0, 8).toUpperCase()}`,
    type: input.type,
    title: input.title,
    description: input.description,
    recipientEmail: email.toLowerCase(),
    link: input.link ?? null,
    read: false,
    readAt: null,
    createdAt: new Date().toISOString(),
  });
}

/** Resolves a staff member's login by their display name (as stored on projects/orders/jobs) — silently skips if they have no account. */
export function notifyByName(name: string | null | undefined, input: NotifyInput): void {
  if (!name) return;
  const user = listUsers().find((u) => u.name === name);
  if (user) notifyEmail(user.email, input);
}

export function notifyAdmins(input: NotifyInput): void {
  for (const user of listUsers().filter((u) => u.role === "admin")) {
    notifyEmail(user.email, input);
  }
}

/** Notifies every active staff member holding a given role — e.g. every commercial, so an unassigned request reaches all of them, not just whoever eventually claims it. */
export function notifyByRole(role: string, input: NotifyInput): void {
  for (const user of listUsers().filter((u) => u.role === role && u.active)) {
    notifyEmail(user.email, input);
  }
}
