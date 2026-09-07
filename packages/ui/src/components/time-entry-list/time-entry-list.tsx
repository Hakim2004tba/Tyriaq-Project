import * as React from "react";
import { MoreHorizontal, Clock } from "lucide-react";
import type { TaskTimeEntryWithUser } from "@flow/types";
import { formatDuration, formatRelativeTime } from "@flow/utils";
import { ListItem } from "../list/list";
import { Avatar } from "../avatar/avatar";
import { Button } from "../button/button";
import { EmptyState } from "../empty-state/empty-state";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../dropdown-menu/dropdown-menu";

export interface TimeEntryListProps {
  entries: TaskTimeEntryWithUser[];
  /** Per-entry edit/delete permission (own entry, or a task manager) —
   * computed by the caller from task-level permissions. */
  canManage: (entry: TaskTimeEntryWithUser) => boolean;
  onEdit: (entry: TaskTimeEntryWithUser) => void;
  onDelete: (entry: TaskTimeEntryWithUser) => void;
}

/** Completed time entries for a task — running entries aren't listed
 * here (TimeTracker owns showing the current running state). */
export function TimeEntryList({ entries, canManage, onEdit, onDelete }: TimeEntryListProps) {
  const completed = entries.filter((e) => e.endedAt !== null);

  if (completed.length === 0) {
    return <EmptyState icon={<Clock className="size-5" />} title="No time logged yet" description="Start a timer or add a manual entry." />;
  }

  return (
    <div className="flex flex-col">
      {completed.map((entry) => (
        <ListItem
          key={entry.id}
          leading={<Avatar name={entry.user.fullName || "Unnamed"} src={entry.user.avatarUrl} size="sm" />}
          trailing={
            canManage(entry) ? (
              <div className="flex items-center gap-2">
                <span className="text-body-sm font-medium text-text-primary">{formatDuration(entry.durationSeconds ?? 0)}</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Time entry actions" className="size-6">
                      <MoreHorizontal className="size-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => onEdit(entry)}>Edit</DropdownMenuItem>
                    <DropdownMenuItem destructive onSelect={() => onDelete(entry)}>
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <span className="text-body-sm font-medium text-text-primary">{formatDuration(entry.durationSeconds ?? 0)}</span>
            )
          }
        >
          <span className="flex flex-col">
            <span className="text-body-sm text-text-primary">{entry.user.fullName || "Unnamed"}</span>
            <span className="text-caption text-text-muted">
              {formatRelativeTime(entry.startedAt)}
              {entry.note ? ` · ${entry.note}` : ""}
            </span>
          </span>
        </ListItem>
      ))}
    </div>
  );
}
