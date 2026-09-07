import * as React from "react";
import {
  CirclePlus,
  Pencil,
  CircleDot,
  Flag,
  UserPlus,
  UserMinus,
  MessageSquare,
  MessageSquareText,
  FileText,
  Archive,
  Paperclip,
  FileX,
  FolderPlus,
  FolderArchive,
} from "lucide-react";
import type { ActivityEventType, ActivityMetadata } from "@flow/types";

/**
 * Translates a structured activity event (event_type + metadata) into
 * the icon + sentence pieces ActivityItem renders. This is the ONE
 * place "the UI generates the sentence" (brief) — the database never
 * stores rendered text, only facts like {"field":"priority","from":
 * "medium","to":"high"}.
 */
export function formatActivityEvent(
  eventType: ActivityEventType,
  metadata: ActivityMetadata,
  actorName: string,
  targetName: { user?: (userId: string) => string } = {}
): { icon: React.ReactNode; verb: string; target: string; detail?: string } {
  const iconProps = { className: "size-4" } as const;

  switch (eventType) {
    case "task_created":
      return { icon: <CirclePlus {...iconProps} />, verb: "created this task", target: "" };
    case "task_updated": {
      const field = typeof metadata.field === "string" ? metadata.field : "a field";
      return { icon: <Pencil {...iconProps} />, verb: `updated the ${field}`, target: "" };
    }
    case "task_status_changed": {
      const from = formatEnumValue(metadata.from);
      const to = formatEnumValue(metadata.to);
      return { icon: <CircleDot {...iconProps} />, verb: "changed status", target: "", detail: `${from} → ${to}` };
    }
    case "task_priority_changed": {
      const from = formatEnumValue(metadata.from);
      const to = formatEnumValue(metadata.to);
      return { icon: <Flag {...iconProps} />, verb: "changed priority", target: "", detail: `${from} → ${to}` };
    }
    case "task_assignee_added": {
      const name = typeof metadata.user_id === "string" ? targetName.user?.(metadata.user_id) ?? "someone" : "someone";
      return { icon: <UserPlus {...iconProps} />, verb: "assigned", target: name };
    }
    case "task_assignee_removed": {
      const name = typeof metadata.user_id === "string" ? targetName.user?.(metadata.user_id) ?? "someone" : "someone";
      return { icon: <UserMinus {...iconProps} />, verb: "unassigned", target: name };
    }
    case "comment_created":
      return { icon: <MessageSquare {...iconProps} />, verb: "added a comment", target: "" };
    case "comment_edited":
      return { icon: <MessageSquareText {...iconProps} />, verb: "edited a comment", target: "" };
    case "document_created":
      return { icon: <FileText {...iconProps} />, verb: "created this document", target: "" };
    case "document_updated":
      return { icon: <Pencil {...iconProps} />, verb: "updated the document", target: "" };
    case "document_archived":
      return { icon: <Archive {...iconProps} />, verb: "archived the document", target: "" };
    case "file_uploaded": {
      const fileName = typeof metadata.file_name === "string" ? metadata.file_name : "a file";
      return { icon: <Paperclip {...iconProps} />, verb: "attached", target: fileName };
    }
    case "file_deleted": {
      const fileName = typeof metadata.file_name === "string" ? metadata.file_name : "a file";
      return { icon: <FileX {...iconProps} />, verb: "removed", target: fileName };
    }
    case "project_created":
      return { icon: <FolderPlus {...iconProps} />, verb: "created this project", target: "" };
    case "project_archived":
      return { icon: <FolderArchive {...iconProps} />, verb: "archived this project", target: "" };
    default:
      return { icon: <Pencil {...iconProps} />, verb: "made a change", target: "" };
  }
}

function formatEnumValue(value: unknown): string {
  if (typeof value !== "string") return "—";
  return value
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export { formatActivityEvent as default };
