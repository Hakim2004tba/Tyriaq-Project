import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMail } from "@/lib/mail/send";
import { layout } from "@/lib/mail/templates";
import { linkFor, type NotificationKind } from "@/lib/data/notification-types";

/**
 * The daily digest.
 *
 * Everything somebody has not read and has not already been mailed
 * about, in one message per person. One message rather than one per
 * notification: a product that sends eleven emails about eleven comments
 * is a product people filter into a folder they never open.
 *
 * Runs on a schedule (see vercel.json). It is idempotent — every row it
 * sends is stamped with `email_sent_at`, so a retry after a timeout, or
 * a second run in the same day, mails nobody twice.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

/** How far back a first run will look, so it cannot mail a year of backlog. */
const WINDOW_HOURS = 36;

export async function GET(request: Request): Promise<NextResponse> {
  /*
    The schedule is public HTTP, so the secret is what separates the
    scheduler from anybody who guesses the path. Vercel sends it as a
    bearer token; a manual run can pass the same header.
  */
  const secret = process.env.CRON_SECRET?.trim();
  const authorised =
    !secret || request.headers.get("authorization") === `Bearer ${secret}`;
  if (!authorised) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is not set — the digest cannot read for other people." },
      { status: 503 }
    );
  }

  const since = new Date(Date.now() - WINDOW_HOURS * 60 * 60 * 1000).toISOString();

  const { data: rows, error } = await supabase
    .from("notifications")
    .select(
      "id, user_id, workspace_id, kind, title, body, created_at, task_id, document_id, conversation_id, project_id, space_id, tasks(projects(slug)), projects(slug), spaces(slug)"
    )
    .is("read_at", null)
    .is("email_sent_at", null)
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(2000);

  if (error) {
    console.error("[tyriaq] digest could not read notifications:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type Row = {
    id: string; user_id: string; workspace_id: string; kind: NotificationKind;
    title: string; body: string | null; created_at: string;
    task_id: string | null; document_id: string | null; conversation_id: string | null;
    project_id: string | null; space_id: string | null;
    tasks: { projects: { slug: string } | null } | null;
    projects: { slug: string } | null;
    spaces: { slug: string } | null;
  };

  const byPerson = new Map<string, Row[]>();
  for (const row of (rows ?? []) as unknown as Row[]) {
    const list = byPerson.get(row.user_id);
    if (list) list.push(row);
    else byPerson.set(row.user_id, [row]);
  }

  let sent = 0;
  let skipped = 0;
  const mailed: string[] = [];

  for (const [userId, items] of byPerson) {
    /*
      Preferences are per workspace, and one person's digest can span
      several. Muted kinds are dropped per row; the digest as a whole is
      off only if it is off in every workspace the row came from.
    */
    const kept: Row[] = [];
    for (const item of items) {
      const { data: prefs } = await supabase
        .rpc("email_preferences", { p_user: userId, p_workspace: item.workspace_id })
        .maybeSingle();
      const pref = prefs as { digest: boolean; mentions: boolean; muted: string[] } | null;
      if (pref && pref.digest === false) continue;
      if (pref?.muted?.includes(item.kind)) continue;
      kept.push(item);
    }

    if (kept.length === 0) {
      // Nothing to say, but these rows should not be reconsidered
      // tomorrow — the decision not to mail them was already made.
      mailed.push(...items.map((item) => item.id));
      skipped += 1;
      continue;
    }

    const { data: account } = await supabase.auth.admin.getUserById(userId);
    const address = account?.user?.email;
    if (!address) {
      skipped += 1;
      continue;
    }

    const { text, html } = layout({
      heading:
        kept.length === 1
          ? "One thing waiting in Tyriaq"
          : `${kept.length} things waiting in Tyriaq`,
      intro: "Since you last read your inbox.",
      lines: kept.slice(0, 12).map((item) => ({
        title: item.title,
        body: item.body,
        href:
          linkFor({
            taskId: item.task_id,
            projectSlug: item.tasks?.projects?.slug ?? item.projects?.slug ?? null,
            documentId: item.document_id,
            conversationId: item.conversation_id,
            spaceSlug: item.spaces?.slug ?? null,
          }) ?? "/inbox",
      })),
      action: { label: "Open your inbox", href: "/inbox" },
      footer:
        kept.length > 12
          ? `Showing 12 of ${kept.length}. The rest are in your inbox.`
          : "You are receiving this because you have unread notifications in Tyriaq.",
    });

    const result = await sendMail({
      to: address,
      subject:
        kept.length === 1 ? kept[0]!.title : `${kept.length} updates in Tyriaq`,
      text,
      html,
    });

    if (result.sent) {
      sent += 1;
      mailed.push(...items.map((item) => item.id));
    }
  }

  /*
    Stamped AFTER sending, in one statement.

    Stamping first would lose a digest whenever the mail provider was
    down; stamping after means the worst case is a message sent twice if
    this update fails, which is the better of the two failures.
  */
  if (mailed.length > 0) {
    const { error: stampError } = await supabase
      .from("notifications")
      .update({ email_sent_at: new Date().toISOString() })
      .in("id", mailed);
    if (stampError) console.error("[tyriaq] digest could not stamp rows:", stampError);
  }

  return NextResponse.json({ people: byPerson.size, sent, skipped, rows: mailed.length });
}
