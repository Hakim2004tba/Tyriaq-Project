"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { markNotificationRead } from "@/lib/actions/notifications";
import { formatShortDateTime } from "@/lib/format";
import type { UserNotificationRecord, NotificationType } from "@/lib/data/operations";

const TYPE_VARIANT: Record<NotificationType, "neutral" | "info" | "success" | "warning" | "danger" | "gold"> = {
  new_lead: "info",
  new_client: "info",
  new_devis: "info",
  devis_accepted: "success",
  devis_refused: "danger",
  design_revision_requested: "warning",
  design_approved: "success",
  production_started: "info",
  production_delayed: "warning",
  vernissage_assigned: "info",
  quality_issue: "danger",
  montage_scheduled: "info",
  montage_delayed: "warning",
  payment_received: "success",
  payment_overdue: "danger",
  sav_created: "warning",
  task_assigned: "gold",
  new_message: "neutral",
};

function NotificationsList({ notifications }: { notifications: UserNotificationRecord[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  async function handleClick(n: UserNotificationRecord) {
    if (!n.read) {
      setPendingId(n.id);
      await markNotificationRead(n.id);
      setPendingId(null);
      router.refresh();
    }
    if (n.link) router.push(n.link);
  }

  return (
    <div className="flex flex-col gap-2.5">
      {notifications.map((n) => (
        <Card
          key={n.id}
          onClick={() => handleClick(n)}
          className={`flex cursor-pointer items-start gap-3 p-4 transition-colors hover:border-border-strong ${n.read ? "opacity-70" : ""} ${pendingId === n.id ? "pointer-events-none" : ""}`}
        >
          {!n.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-strong" />}
          <div className={`flex-1 ${n.read ? "pl-[0.9375rem]" : ""}`}>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-text-primary">{n.title}</p>
              <Badge variant={TYPE_VARIANT[n.type]}>{n.type.replaceAll("_", " ")}</Badge>
            </div>
            <p className="mt-0.5 text-sm text-text-secondary">{n.description}</p>
            <p className="mt-1 text-xs text-text-muted">{formatShortDateTime(n.createdAt)}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}

export { NotificationsList };
