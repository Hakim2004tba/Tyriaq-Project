import { createClient } from "@/lib/supabase/server";
import { reportReadError } from "./report";
import { getCurrentUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  linkFor,
  type AppNotification,
  type NotificationKind,
} from "./notification-types";

/**
 * Notification reads.
 *
 * RLS restricts these to the caller's own rows, so nothing here filters
 * by user. The unread count comes back from the same query as the list
 * rather than a second round trip — the badge and the panel are always
 * looking at one answer.
 */

export interface NotificationFeed {
  items: AppNotification[];
  unread: number;
  mutedKinds: NotificationKind[];
  /** Whether mail leaves the building at all, and how promptly. */
  emailDigest: boolean;
  emailMentions: boolean;
}

export const EMPTY_FEED: NotificationFeed = {
  items: [],
  unread: 0,
  mutedKinds: [],
  emailDigest: true,
  emailMentions: true,
};

export async function getNotifications(limit = 40): Promise<NotificationFeed> {
  if (!isSupabaseConfigured) return EMPTY_FEED;
  const user = await getCurrentUser();
  if (!user) return EMPTY_FEED;

  const supabase = await createClient();

  const [{ data, error }, { count, error: countError }, { data: prefs, error: prefsError }] =
    await Promise.all([
      supabase
        .from("notifications")
        .select(
          "id, kind, title, body, created_at, read_at, actor_id, task_id, document_id, conversation_id, project_id, space_id, actor:profiles!actor_id(full_name), tasks(projects(slug)), projects(slug), spaces(slug)"
        )
        .order("created_at", { ascending: false })
        .limit(limit),
      // `head: true` asks for the number without the rows — the badge
      // needs a count, not forty records it will not render.
      supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
      supabase.from("notification_preferences").select("muted_kinds, email_digest, email_mentions"),
    ]);

  reportReadError("getNotifications", error);
  reportReadError("getNotifications:count", countError);
  reportReadError("getNotifications:preferences", prefsError);

  const items = ((data ?? []) as unknown as {
    id: string; kind: NotificationKind; title: string; body: string | null;
    created_at: string; read_at: string | null;
    actor: { full_name: string } | null;
    task_id: string | null; document_id: string | null;
    conversation_id: string | null; project_id: string | null; space_id: string | null;
    tasks: { projects: { slug: string } | null } | null;
    projects: { slug: string } | null;
    spaces: { slug: string } | null;
  }[]).map((row) => ({
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
    read: row.read_at !== null,
    actorName: row.actor?.full_name || null,
    href: linkFor({
      taskId: row.task_id,
      // A task's project comes through the task, so a notification about
      // a task in a project the reader lost access to resolves to null
      // and renders as unclickable rather than as a broken link.
      projectSlug: row.tasks?.projects?.slug ?? row.projects?.slug ?? null,
      documentId: row.document_id,
      conversationId: row.conversation_id,
      spaceSlug: row.spaces?.slug ?? null,
    }),
  }));

  const rows = (prefs ?? []) as unknown as {
    muted_kinds: NotificationKind[] | null;
    email_digest: boolean | null;
    email_mentions: boolean | null;
  }[];
  const muted = rows.flatMap((row) => row.muted_kinds ?? []);

  /*
    Off only if it is off everywhere. Preferences are per workspace and
    this screen is one switch — reading it as "on unless every workspace
    says otherwise" keeps the switch honest for the common case of one
    workspace, without pretending the column is global.
  */
  return {
    items,
    unread: count ?? 0,
    mutedKinds: Array.from(new Set(muted)),
    emailDigest: rows.length === 0 || rows.some((row) => row.email_digest !== false),
    emailMentions: rows.length === 0 || rows.some((row) => row.email_mentions !== false),
  };
}
