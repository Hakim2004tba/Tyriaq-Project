"use client";

import { Flag, MessageSquare, Paperclip } from "lucide-react";
import { AvatarGroup } from "@flow/ui";
import { cn } from "@flow/utils";
import { SPACE_COLOR } from "@/components/shell";
import {
  TASK_STATUS_META,
  type Priority,
  type ProjectTask,
  initialsOf,
} from "@/lib/data/task-types";
import type { Project } from "@/lib/data/types";

const PRIORITY_TONE: Record<Priority, { text: string; label: string }> = {
  urgent: { text: "text-danger", label: "Urgent" },
  high: { text: "text-danger", label: "High" },
  medium: { text: "text-warning", label: "Medium" },
  low: { text: "text-success", label: "Low" },
};

/** The left edge stripe — priority as a shape, not only a colour. */
const PRIORITY_EDGE: Record<Priority, string> = {
  urgent: "bg-danger",
  high: "bg-danger/70",
  medium: "bg-warning",
  low: "bg-success",
};

export interface CalendarTaskProps {
  task: ProjectTask;
  project?: Project;
  /** `chip` fits a month cell, `card` has room for avatars and meta. */
  variant: "chip" | "card";
  draggable: boolean;
  dragging: boolean;
  onOpen: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

/**
 * One task on the calendar.
 *
 * Two densities from one component so a task looks like the same object
 * whether it is a line in a month cell or a card in a day column —
 * status dot, priority edge and title stay in the same relative places,
 * and only the meta that will not fit is dropped.
 */
export function CalendarTask({
  task,
  project,
  variant,
  draggable,
  dragging,
  onOpen,
  onDragStart,
  onDragEnd,
}: CalendarTaskProps) {
  const done = task.status === "done";
  const status = TASK_STATUS_META[task.status];
  const priority = PRIORITY_TONE[task.priority];
  const chip = project ? SPACE_COLOR[project.color] : null;

  if (variant === "chip") {
    return (
      <button
        type="button"
        draggable={draggable}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onClick={onOpen}
        title={`${task.title} — ${status.label}, ${priority.label} priority`}
        className={cn(
          "group relative flex w-full items-center gap-1.5 overflow-hidden rounded-sm py-[3px] pl-2 pr-1.5",
          "bg-surface-elevated text-left transition-colors duration-fast",
          "hover:bg-white/[0.09] focus-visible:outline-none focus-visible:shadow-focus",
          draggable && "cursor-grab active:cursor-grabbing",
          dragging && "opacity-35",
          done && "opacity-60"
        )}
      >
        <span
          className={cn("absolute inset-y-0 left-0 w-[3px]", PRIORITY_EDGE[task.priority])}
          aria-hidden="true"
        />
        <span className={cn("size-1.5 shrink-0 rounded-full", status.accent)} aria-hidden="true" />
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-caption",
            done ? "text-text-muted line-through" : "text-text-secondary"
          )}
        >
          {task.title}
        </span>
        <span className="sr-only">
          {status.label}, {priority.label} priority
        </span>
      </button>
    );
  }

  return (
    <article
      role="button"
      tabIndex={0}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={cn(
        "group relative overflow-hidden rounded-md border border-border bg-surface p-2 pl-2.5 shadow-card",
        "transition-all duration-fast ease-emphasized",
        "hover:-translate-y-px hover:border-border-strong hover:shadow-card-hover",
        "focus-visible:outline-none focus-visible:shadow-focus",
        draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
        dragging && "opacity-35"
      )}
    >
      <span
        className={cn("absolute inset-y-0 left-0 w-[3px]", PRIORITY_EDGE[task.priority])}
        aria-hidden="true"
      />

      <div className="flex items-start gap-1.5">
        <span className={cn("mt-1 size-1.5 shrink-0 rounded-full", status.accent)} aria-hidden="true" />
        <p
          className={cn(
            "min-w-0 flex-1 text-caption leading-[16px]",
            done ? "text-text-muted line-through" : "text-text-primary"
          )}
        >
          {task.title}
        </p>
      </div>

      {chip && project && (
        <p className="mt-1.5 flex items-center gap-1.5 pl-3">
          <span
            className={cn(
              "flex size-3.5 shrink-0 items-center justify-center rounded-[4px] text-[7px] font-bold ring-1 ring-inset",
              chip.chip,
              chip.text
            )}
            aria-hidden="true"
          >
            {initialsOf(project.name)}
          </span>
          <span className="truncate text-[11px] text-text-muted">{project.name}</span>
        </p>
      )}

      <div className="mt-2 flex items-center justify-between gap-2 pl-3">
        <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium", priority.text)}>
          <Flag className={cn("size-2.5", task.priority === "urgent" && "fill-current")} aria-hidden="true" />
          {priority.label}
        </span>
        <span className="flex items-center gap-1.5">
          {task.comments ? (
            <span className="inline-flex items-center gap-0.5 text-[11px] tabular text-text-muted">
              <MessageSquare className="size-2.5" aria-hidden="true" />
              {task.comments}
            </span>
          ) : null}
          {task.attachments ? (
            <span className="inline-flex items-center gap-0.5 text-[11px] tabular text-text-muted">
              <Paperclip className="size-2.5" aria-hidden="true" />
              {task.attachments}
            </span>
          ) : null}
          <AvatarGroup people={task.assignees.map((a) => ({ id: a.id, name: a.name, avatarUrl: a.avatarUrl }))} max={2} size="xs" />
        </span>
      </div>
    </article>
  );
}

/** Compact legend so status and priority colours are decodable without
 * hovering every chip. */
export function CalendarLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-caption text-text-muted">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-[3px] rounded-sm bg-danger" aria-hidden="true" /> Urgent / High
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-[3px] rounded-sm bg-warning" aria-hidden="true" /> Medium
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-[3px] rounded-sm bg-success" aria-hidden="true" /> Low
      </span>
      <span className="mx-1 hidden h-3 w-px bg-border sm:block" aria-hidden="true" />
      <span className="inline-flex items-center gap-1.5">
        <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" /> In progress
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="size-1.5 rounded-full bg-warning" aria-hidden="true" /> In review
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="size-1.5 rounded-full bg-success" aria-hidden="true" /> Done
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="size-1.5 rounded-full bg-danger" aria-hidden="true" /> Blocked
      </span>
    </div>
  );
}
