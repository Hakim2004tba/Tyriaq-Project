/**
 * Notification domain types (Phase 08). Mirrors supabase/migrations'
 * notifications table — see supabase/migrations/README.md for the
 * target model, deduplication strategy, and RLS decisions.
 *
 * Deliberately a separate concept from ./activity's ActivityEvent:
 * Activity is an append-only historical record of what happened,
 * visible to any workspace member. A Notification is a user-specific
 * attention record ("what should THIS user know about"), private to
 * its recipient. One activity-worthy mutation can fan out to zero, one,
 * or several notifications; notifications are never queried to
 * reconstruct activity, and activity is never a substitute for
 * notifications. Never merge these two types.
 */
import type { CommentAuthor } from "./comment";

/** Matches the `notification_type` Postgres enum exactly — deliberately
 * small (see supabase/migrations README for why `task_mentioned` is
 * excluded: no rich-text task body exists to parse mentions from). */
export const NOTIFICATION_TYPES = ["task_assigned", "document_mentioned", "comment_replied", "comment_mentioned"] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** Groups the 4 notification types into the 3 categories an Inbox-style
 * UI naturally organizes by (Phase 18). Not a new stored fact — purely
 * a UI grouping derived from the existing type, so it lives here next
 * to NotificationType rather than as its own database column. */
export type NotificationCategory = "assignment" | "mention" | "comment";
export const NOTIFICATION_CATEGORY: Record<NotificationType, NotificationCategory> = {
  task_assigned: "assignment",
  document_mentioned: "mention",
  comment_mentioned: "mention",
  comment_replied: "comment",
};

/** Matches the `notification_entity_type` Postgres enum — a
 * notification's target is one of these three, never anything else. */
export const NOTIFICATION_ENTITY_TYPES = ["task", "document", "comment"] as const;

export type NotificationEntityType = (typeof NOTIFICATION_ENTITY_TYPES)[number];

/**
 * Structured facts only — never a rendered sentence (same principle as
 * ActivityMetadata; the UI's notification formatter owns turning this
 * into readable text — see @flow/ui). Loosely typed since the exact key
 * set differs per notification_type; the formatter narrows per-type.
 */
export type NotificationMetadata = Record<string, unknown>;

/** Mirrors the `notifications` table. */
export interface Notification {
  id: string;
  workspaceId: string;
  recipientUserId: string;
  actorUserId: string | null;
  type: NotificationType;
  entityType: NotificationEntityType;
  entityId: string;
  metadata: NotificationMetadata;
  readAt: string | null;
  createdAt: string;
}

/** A notification joined with its actor's display info — the shape
 * NotificationItem renders directly. `actor` is null for the (currently
 * unused but schema-supported) case of an actor-less notification. */
export interface NotificationWithActor extends Notification {
  actor: CommentAuthor | null;
}

/** `entityType` + `entityId` as a discriminated union, mirroring the
 * CommentTarget/AttachmentTarget pattern — useful when resolving a
 * notification's target route without re-checking `entityType` by hand
 * at every call site. */
export type NotificationTarget =
  | { entityType: "task"; entityId: string }
  | { entityType: "document"; entityId: string }
  | { entityType: "comment"; entityId: string };

/** Inbox filter — kept intentionally simple (brief Part 19: "do not
 * create an advanced notification query language"). */
export type NotificationFilter = "all" | "unread";

/** Lightweight shape for the unread-count query — deliberately just the
 * number, so the badge never needs to fetch the full notification list
 * merely to display a count (brief Part 20). */
export interface NotificationUnreadCount {
  count: number;
}
