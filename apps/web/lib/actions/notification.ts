"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getCurrentWorkspace } from "@/lib/data/queries";
import { NOTIFICATION_KINDS, type NotificationKind } from "@/lib/data/notification-types";
import type { ActionResult } from "./workspace";

/**
 * Notification writes.
 *
 * Marking read and setting preferences — that is the whole client-side
 * surface. Notifications themselves are created by triggers, and there
 * is no policy that would let this file insert one.
 */

function refresh() {
  // The badge lives in the shell, which every signed-in route renders.
  revalidatePath("/", "layout");
}

export async function markNotificationRead(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .is("read_at", null);

  if (error) return { error: error.message };
  refresh();
  return {};
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return {};

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    // RLS already limits this to the caller's rows; the filter is what
    // stops it rewriting `read_at` on ones they had read days ago.
    .is("read_at", null);

  if (error) return { error: error.message };
  refresh();
  return { message: "All caught up." };
}

export async function setMutedKinds(kinds: NotificationKind[]): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in first." };
  const ws = await getCurrentWorkspace();
  if (!ws) return { error: "No workspace selected." };

  const clean = kinds.filter((kind) => NOTIFICATION_KINDS.includes(kind));

  const supabase = await createClient();
  const { error } = await supabase
    .from("notification_preferences")
    .upsert(
      { user_id: user.id, workspace_id: ws.id, muted_kinds: clean },
      { onConflict: "user_id,workspace_id" }
    );

  if (error) return { error: error.message };
  refresh();
  return { message: "Preferences saved." };
}

/**
 * Runs the due-date sweep.
 *
 * Deadlines pass without anything being written, so no trigger can fire
 * for them. The sweep is idempotent — a unique index makes a second run
 * on the same day a no-op — which is what makes it safe to call on a
 * read like this. On a project with `pg_cron` available it belongs on a
 * schedule instead; the function is written to be called either way.
 */
export async function sweepDueNotifications(): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("sweep_due_notifications");
  // A failure here must not take down the page that asked for it: the
  // reader still gets every notification that already exists.
  if (error) console.error("[tyriaq] due-date sweep failed:", error.message);
}

/**
 * The notification centre's own read.
 *
 * The bell lives inside the client-side shell, which every signed-in
 * route renders — so rather than thread this through the props of every
 * layout in the application, the component asks for it. RLS scopes the
 * answer to the caller, so there is nothing to pass in.
 */
export async function fetchNotifications(): Promise<{
  items: import("@/lib/data/notification-types").AppNotification[];
  unread: number;
  userId: string | null;
}> {
  const user = await getCurrentUser();
  if (!user) return { items: [], unread: 0, userId: null };

  // Deadlines pass silently; this is the moment somebody asks, which is
  // the natural time to check whether any have.
  await sweepDueNotifications();

  const { getNotifications } = await import("@/lib/data/notifications");
  const feed = await getNotifications();
  return { items: feed.items, unread: feed.unread, userId: user.id };
}
