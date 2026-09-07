import * as React from "react";
import { UserPlus, Reply, AtSign, FileText } from "lucide-react";
import type { NotificationType, NotificationMetadata } from "@flow/types";

export interface FormattedNotification {
  icon: React.ReactNode;
  title: string;
  description?: string;
}

const ICON_PROPS = { className: "size-4" } as const;

/**
 * Turns a notification's structured type + metadata into the icon/title/
 * description NotificationItem renders. The database only ever stores
 * facts (task_id, task_title, etc — never a rendered sentence); this is
 * the one place that becomes readable text, mirroring
 * activity-feed/format-activity.tsx's exact same principle. Pure: no
 * Supabase, no mutation, no routing/href resolution (that's a separate
 * concern the caller owns, since it needs workspace-slug context this
 * function deliberately doesn't have).
 */
export function formatNotification(
  type: NotificationType,
  metadata: NotificationMetadata,
  actorName: string
): FormattedNotification {
  switch (type) {
    case "task_assigned": {
      const taskTitle = typeof metadata.task_title === "string" ? metadata.task_title : undefined;
      return {
        icon: <UserPlus {...ICON_PROPS} />,
        title: `${actorName} assigned you a task`,
        description: taskTitle,
      };
    }
    case "comment_replied":
      return {
        icon: <Reply {...ICON_PROPS} />,
        title: `${actorName} replied to your comment`,
      };
    case "comment_mentioned":
      return {
        icon: <AtSign {...ICON_PROPS} />,
        title: `${actorName} mentioned you in a comment`,
      };
    case "document_mentioned":
      return {
        icon: <FileText {...ICON_PROPS} />,
        title: `${actorName} mentioned you in a document`,
      };
    default:
      return {
        icon: <AtSign {...ICON_PROPS} />,
        title: `${actorName} sent you a notification`,
      };
  }
}
