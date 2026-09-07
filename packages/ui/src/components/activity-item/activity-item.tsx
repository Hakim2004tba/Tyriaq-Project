import * as React from "react";
import type { ActivityRef } from "@flow/types";
import { formatRelativeTime } from "@flow/utils";
import { Avatar } from "../avatar/avatar";

export interface ActivityItemProps {
  activity: ActivityRef;
  /** Optional leading glyph (e.g. a status/field icon) shown next to the
   * avatar — extends the original avatar-only layout without breaking
   * existing callers that don't pass one. */
  icon?: React.ReactNode;
  /** Optional second line for a structured before/after value, e.g.
   * "Medium → High" — kept as a separate prop rather than folded into
   * `verb`/`target` so ActivityFeed can render it as its own line. */
  detail?: React.ReactNode;
}

export function ActivityItem({ activity, icon, detail }: ActivityItemProps) {
  return (
    <div className="flex items-start gap-3 py-2">
      {icon ? (
        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center text-text-muted">{icon}</span>
      ) : (
        <Avatar name={activity.actor.name} src={activity.actor.avatarUrl} size="sm" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-body-sm text-text-primary">
          <span className="font-medium">{activity.actor.name}</span>{" "}
          <span className="text-text-secondary">{activity.verb}</span>{" "}
          <span className="font-medium">{activity.target}</span>
        </p>
        {detail && <p className="mt-0.5 text-body-sm text-text-secondary">{detail}</p>}
        <p className="mt-0.5 text-caption text-text-muted">{formatRelativeTime(activity.timestamp)}</p>
      </div>
    </div>
  );
}
