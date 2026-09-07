export type NotificationKind =
  | "task_assigned"
  | "task_mentioned"
  | "comment_mention"
  | "task_status"
  | "task_completed"
  | "due_soon"
  | "task_overdue"
  | "project_added"
  | "workspace_added"
  | "message_received";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string | null;
  createdAt: string;
  read: boolean;
  actorName: string | null;
  /** Where clicking it goes. Null when the thing it referred to is gone. */
  href: string | null;
}

export const NOTIFICATION_KINDS: NotificationKind[] = [
  "task_assigned",
  "task_mentioned",
  "comment_mention",
  "task_status",
  "task_completed",
  "due_soon",
  "task_overdue",
  "project_added",
  "workspace_added",
  "message_received",
];

/**
 * What each kind is, in the words a person would use to decide whether
 * they want it. These labels are the preferences screen.
 */
export const KIND_META: Record<NotificationKind, { label: string; description: string }> = {
  task_assigned: { label: "Task assigned to me", description: "Somebody puts a task in your hands" },
  task_mentioned: { label: "A task of mine is mentioned", description: "Your work is referenced in a message or document" },
  comment_mention: { label: "I'm mentioned", description: "Somebody writes @you in a comment or a message" },
  task_status: { label: "Task status changes", description: "Work you hold or created moves between columns" },
  task_completed: { label: "Task completed", description: "Work you hold or created is finished" },
  due_soon: { label: "Due soon", description: "A task assigned to you is due today or tomorrow" },
  task_overdue: { label: "Overdue", description: "A task assigned to you has passed its due date" },
  project_added: { label: "Added to a project", description: "Somebody brings you onto a project" },
  workspace_added: { label: "Added to a workspace", description: "Somebody brings you into a workspace" },
  message_received: { label: "New messages", description: "Any message in a conversation you are in" },
};

/**
 * Where a notification leads.
 *
 * Built from the ids on the row rather than stored as a string: a task
 * that moves project, or a project that is renamed, would leave a stored
 * URL pointing at the wrong place — or nowhere.
 */
export function linkFor(row: {
  taskId: string | null;
  projectSlug: string | null;
  documentId: string | null;
  conversationId: string | null;
}): string | null {
  // A task inside its project, with the details panel already open —
  // clicking "you were assigned this" should land on the task itself,
  // not on a board where the reader has to find it.
  if (row.taskId && row.projectSlug) return `/projects/${row.projectSlug}?task=${row.taskId}`;
  if (row.documentId) return `/documents/${row.documentId}`;
  if (row.conversationId) return `/chat?c=${row.conversationId}`;
  if (row.projectSlug) return `/projects/${row.projectSlug}`;
  return null;
}
