import * as React from "react";
import { Activity as ActivityIcon } from "lucide-react";
import type { ActivityEventWithActor } from "@flow/types";
import { ActivityItem } from "../activity-item/activity-item";
import { EmptyState } from "../empty-state/empty-state";
import { Skeleton } from "../skeleton/skeleton";
import { Button } from "../button/button";
import { formatActivityEvent } from "./format-activity";

export interface ActivityFeedProps {
  events: ActivityEventWithActor[];
  loading?: boolean;
  /** Resolves a mentioned/assigned user id to a display name for events
   * like task_assignee_added — supplied by the parent (which already has
   * the member list loaded), not fetched here. */
  resolveUserName?: (userId: string) => string;
  onLoadMore?: () => void;
  loadingMore?: boolean;
  hasMore?: boolean;
}

/**
 * A pure renderer over already-fetched, already-authorized activity
 * data. It never calls Supabase, never records an event, and never
 * decides what counts as "activity" — that's entirely the database
 * triggers' job (see supabase/migrations/20260819170300_activity_triggers.sql).
 * This component's only responsibility is turning ActivityEventWithActor[]
 * into a readable, icon+text feed.
 */
export function ActivityFeed({ events, loading, resolveUserName, onLoadMore, loadingMore, hasMore }: ActivityFeedProps) {
  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="size-6 rounded-full" />
            <div className="flex-1 flex flex-col gap-1.5">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <EmptyState
        icon={<ActivityIcon className="size-5" />}
        title="No activity yet"
        description="Changes to this item will show up here."
      />
    );
  }

  return (
    <div className="flex flex-col divide-y divide-border">
      {events.map((event) => {
        const actorName = event.actor?.fullName || "Someone";
        const { icon, verb, target, detail } = formatActivityEvent(event.eventType, event.metadata, actorName, {
          user: resolveUserName,
        });
        return (
          <ActivityItem
            key={event.id}
            icon={icon}
            detail={detail}
            activity={{
              id: event.id,
              actor: { id: event.actorId ?? "", name: actorName, avatarUrl: event.actor?.avatarUrl },
              verb,
              target,
              timestamp: event.createdAt,
            }}
          />
        );
      })}
      {hasMore && onLoadMore && (
        <div className="pt-3">
          <Button variant="secondary" size="sm" onClick={onLoadMore} loading={loadingMore}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
