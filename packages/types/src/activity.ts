/**
 * Activity domain types (Phase 07). Mirrors supabase/migrations'
 * activity_events table. This is a user-facing activity feed, not an
 * audit/compliance log — see supabase/migrations/README.md.
 */
import type { CommentAuthor } from "./comment";

/** Matches the `activity_event_type` Postgres enum exactly — a
 * deliberately small, non-speculative set (brief Part 8). */
export const ACTIVITY_EVENT_TYPES = [
  "task_created",
  "task_updated",
  "task_status_changed",
  "task_priority_changed",
  "task_assignee_added",
  "task_assignee_removed",
  "comment_created",
  "comment_edited",
  "document_created",
  "document_updated",
  "document_archived",
  "file_uploaded",
  "file_deleted",
  "project_created",
  "project_archived",
  "time_logged",
] as const;

export type ActivityEventType = (typeof ACTIVITY_EVENT_TYPES)[number];

/**
 * Structured facts only — never a rendered sentence (the UI generates
 * the sentence from event_type + metadata). Loosely typed here since
 * the exact key set differs per event_type; components that render a
 * specific event type narrow this themselves.
 */
export type ActivityMetadata = Record<string, unknown>;

/** Mirrors the `activity_events` table. */
export interface ActivityEvent {
  id: string;
  workspaceId: string;
  actorId: string | null;
  projectId: string | null;
  taskId: string | null;
  documentId: string | null;
  eventType: ActivityEventType;
  metadata: ActivityMetadata;
  createdAt: string;
}

/** An activity event joined with its actor's display info. */
export interface ActivityEventWithActor extends ActivityEvent {
  actor: CommentAuthor | null;
}
