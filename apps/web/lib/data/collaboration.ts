import { createClient } from "@/lib/supabase/server";
import { reportReadError } from "./report";
import {
  attachmentKind,
  formatBytes,
  formatRelative,
  type Person,
  type TaskActivityEntry,
  type TaskAttachment,
  type TaskComment,
  type TimeEntry,
} from "./task-types";

/**
 * Comments, activity and attachments for a set of tasks.
 *
 * The `profiles` embeds are deliberately UNHINTED. Naming a constraint
 * would tie these queries to how a particular database happened to be
 * built — a project repaired from an earlier draft carries the same
 * relationship under a different constraint name, and the hint then
 * matches nothing and the whole read fails. Only one key per column
 * reaches `profiles`, so the relationship is unambiguous without it.
 *
 * Loaded for a whole project in three queries rather than per open task:
 * the panel is opened from a list where the next click is usually
 * another row, and paying one round trip per task would make every
 * second row feel slower than the first.
 */

export interface Collaboration {
  comments: Record<string, TaskComment[]>;
  activity: Record<string, TaskActivityEntry[]>;
  attachments: Record<string, TaskAttachment[]>;
  timeEntries: Record<string, TimeEntry[]>;
}

export const EMPTY_COLLABORATION: Collaboration = {
  comments: {}, activity: {}, attachments: {}, timeEntries: {},
};

type ProfileJoin = { id: string; full_name: string; avatar_url: string | null } | null;

/**
 * `viewerId` and `isAdmin` decide which rows carry an edit or delete
 * affordance. They mirror the policies rather than replace them: the
 * database refuses the write regardless, and this only avoids showing a
 * button that would fail.
 */
export async function getCollaboration(
  taskIds: string[],
  viewerId: string,
  isAdmin: boolean
): Promise<Collaboration> {
  if (taskIds.length === 0) return EMPTY_COLLABORATION;

  const supabase = await createClient();

  const [
    { data: commentRows, error: commentError },
    { data: activityRows, error: activityError },
    { data: attachmentRows, error: attachmentError },
    { data: timeRows, error: timeError },
  ] = await Promise.all([
    supabase
      .from("task_comments")
      .select("id, task_id, author_id, body, mentions, created_at, edited_at, profiles(id, full_name, avatar_url)")
      .in("task_id", taskIds)
      .order("created_at", { ascending: true }),
    supabase
      .from("task_activity")
      .select("id, task_id, actor_id, kind, text, detail, created_at, profiles(id, full_name, avatar_url)")
      .in("task_id", taskIds)
      .order("created_at", { ascending: true }),
    supabase
      .from("task_attachments")
      .select("id, task_id, uploaded_by, storage_path, file_name, mime_type, size_bytes, created_at, profiles(id, full_name, avatar_url)")
      .in("task_id", taskIds)
      .order("created_at", { ascending: true }),
    supabase
      .from("time_entries")
      .select("id, task_id, minutes, note, spent_on, created_at, user_id, profiles(id, full_name)")
      .in("task_id", taskIds)
      .order("created_at", { ascending: true }),
  ]);

  reportReadError("getCollaboration:comments", commentError);
  reportReadError("getCollaboration:activity", activityError);
  reportReadError("getCollaboration:attachments", attachmentError);
  reportReadError("getCollaboration:time", timeError);

  const comments: Record<string, TaskComment[]> = {};
  for (const row of (commentRows ?? []) as unknown as {
    id: string; task_id: string; author_id: string; body: string; mentions: string[] | null;
    created_at: string; edited_at: string | null; profiles: ProfileJoin;
  }[]) {
    push(comments, row.task_id, {
      id: row.id,
      author: personOf(row.profiles, row.author_id),
      body: row.body,
      time: formatRelative(row.created_at),
      createdAt: row.created_at,
      edited: Boolean(row.edited_at),
      mentions: row.mentions ?? [],
      mine: row.author_id === viewerId,
      canDelete: row.author_id === viewerId || isAdmin,
    });
  }

  const activity: Record<string, TaskActivityEntry[]> = {};
  for (const row of (activityRows ?? []) as unknown as {
    id: string; task_id: string; actor_id: string | null; kind: TaskActivityEntry["kind"];
    text: string; detail: string | null; created_at: string; profiles: ProfileJoin;
  }[]) {
    push(activity, row.task_id, {
      id: row.id,
      actor: personOf(row.profiles, row.actor_id ?? ""),
      kind: row.kind,
      text: row.text,
      detail: row.detail ?? undefined,
      time: formatRelative(row.created_at),
      createdAt: row.created_at,
    });
  }

  const attachments: Record<string, TaskAttachment[]> = {};
  for (const row of (attachmentRows ?? []) as unknown as {
    id: string; task_id: string; uploaded_by: string; storage_path: string; file_name: string;
    mime_type: string; size_bytes: number; created_at: string; profiles: ProfileJoin;
  }[]) {
    push(attachments, row.task_id, {
      id: row.id,
      name: row.file_name,
      kind: attachmentKind(row.mime_type),
      size: formatBytes(row.size_bytes),
      uploadedBy: personOf(row.profiles, row.uploaded_by),
      uploadedAt: formatRelative(row.created_at),
      storagePath: row.storage_path,
      mimeType: row.mime_type,
      canRemove: row.uploaded_by === viewerId || isAdmin,
    });
  }

  const timeEntries: Record<string, TimeEntry[]> = {};
  for (const row of (timeRows ?? []) as unknown as {
    id: string; task_id: string; minutes: number; note: string; spent_on: string;
    created_at: string; user_id: string; profiles: ProfileJoin;
  }[]) {
    push(timeEntries, row.task_id, {
      id: row.id,
      person: personOf(row.profiles, row.user_id),
      minutes: row.minutes,
      note: row.note || "Untitled entry",
      when: formatRelative(row.created_at),
    });
  }

  return { comments, activity, attachments, timeEntries };
}

function push<T>(map: Record<string, T[]>, key: string, value: T) {
  const list = map[key];
  if (list) list.push(value);
  else map[key] = [value];
}

/**
 * A deleted account leaves rows behind — the activity feed keeps them on
 * purpose, so history is not rewritten when someone leaves.
 */
function personOf(profile: ProfileJoin, fallbackId: string): Person {
  return {
    id: profile?.id ?? fallbackId,
    name: profile?.full_name || "Former member",
  };
}
