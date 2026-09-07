import * as React from "react";
import { GitCommitVertical, Sparkles, Flag, MessageSquare, Pencil } from "lucide-react";
import type { TimelineEventRef } from "@flow/types";
import { formatRelativeTime, cn } from "@flow/utils";

const kindIcon: Record<NonNullable<TimelineEventRef["kind"]>, React.ElementType> = {
  created: GitCommitVertical,
  updated: Pencil,
  decision: Sparkles,
  milestone: Flag,
  comment: MessageSquare,
};

export interface TimelineItemProps {
  event: TimelineEventRef;
  isLast?: boolean;
}

export function TimelineItem({ event, isLast }: TimelineItemProps) {
  const Icon = kindIcon[event.kind ?? "updated"] ?? GitCommitVertical;
  return (
    <div className="relative flex gap-3 pb-6 last:pb-0">
      {!isLast && (
        <span className="absolute left-[15px] top-8 bottom-0 w-px bg-border" aria-hidden="true" />
      )}
      <span
        className={cn(
          "z-10 flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-primary"
        )}
      >
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="flex-1 min-w-0 pt-1">
        <p className="text-body-sm text-text-primary">{event.title}</p>
        <p className="text-caption text-text-muted">{formatRelativeTime(event.timestamp)}</p>
      </div>
    </div>
  );
}
