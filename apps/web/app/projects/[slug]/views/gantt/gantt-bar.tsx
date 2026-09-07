"use client";

import { Avatar } from "@flow/ui";
import { cn } from "@flow/utils";
import { TASK_STATUS_META, type ProjectTask } from "@/lib/data/task-types";
import { MIN_BAR, dayLabel, type Scale } from "./gantt-scale";

export type DragMode = "move" | "resize-start" | "resize-end" | "link";

/** How complete a bar reads as. Subtasks when they exist, status otherwise. */
export function progressOf(task: ProjectTask): number {
  if (task.status === "done") return 100;
  if (task.subtasks && task.subtasks.total > 0) {
    return Math.round((task.subtasks.done / task.subtasks.total) * 100);
  }
  return task.status === "review" ? 75 : task.status === "in_progress" ? 40 : 0;
}

const TONE = {
  done: "bg-success/25 ring-success/40",
  blocked: "bg-danger/25 ring-danger/45",
  review: "bg-warning/25 ring-warning/40",
  default: "bg-primary/25 ring-border-brand",
} as const;

function toneFor(task: ProjectTask, late: boolean): string {
  if (task.status === "done") return TONE.done;
  if (late || task.status === "blocked") return TONE.blocked;
  if (task.status === "review") return TONE.review;
  return TONE.default;
}

const FILL = {
  done: "bg-success/70",
  blocked: "bg-danger/70",
  review: "bg-warning/70",
  default: "bg-brand",
} as const;

function fillFor(task: ProjectTask, late: boolean): string {
  if (task.status === "done") return FILL.done;
  if (late || task.status === "blocked") return FILL.blocked;
  if (task.status === "review") return FILL.review;
  return FILL.default;
}

export interface GanttBarProps {
  task: ProjectTask;
  scale: Scale;
  top: number;
  height: number;
  /** Live drag offsets, applied for preview before anything is committed. */
  previewStart: number;
  previewDue: number;
  dragging: boolean;
  linking: boolean;
  onOpen: () => void;
  onPointerDown: (e: React.PointerEvent, mode: DragMode) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

/**
 * One row's bar.
 *
 * Three grab targets share the shape: the body moves the task, the two
 * 6px edges resize it, and a handle past the right edge starts a
 * dependency. They are separate elements rather than one element with
 * hit-testing so the cursor tells you which you are on before you press.
 *
 * Milestones render as a diamond — a zero-length bar would be invisible
 * at month zoom, and a milestone is a moment rather than a duration.
 */
export function GanttBar({
  task,
  scale,
  top,
  height,
  previewStart,
  previewDue,
  dragging,
  linking,
  onOpen,
  onPointerDown,
  onKeyDown,
}: GanttBarProps) {
  const late = task.status !== "done" && previewDue < 0;
  const left = scale.x(previewStart);
  const width = Math.max(MIN_BAR, (previewDue - previewStart + 1) * scale.dayWidth);
  const pct = progressOf(task);
  const label = `${task.title} — ${TASK_STATUS_META[task.status].label}, ${dayLabel(previewStart)} to ${dayLabel(previewDue)}`;

  if (task.milestone) {
    return (
      <div
        data-task-id={task.id}
        role="button"
        tabIndex={0}
        aria-label={`${task.title} — milestone on ${dayLabel(previewDue)}`}
        title={`${task.title} — milestone, ${dayLabel(previewDue)}`}
        onClick={onOpen}
        onKeyDown={onKeyDown}
        onPointerDown={(e) => onPointerDown(e, "move")}
        className={cn(
          "absolute z-[15] flex cursor-grab items-center justify-center active:cursor-grabbing",
          "focus-visible:outline-none focus-visible:shadow-focus",
          dragging && "opacity-70"
        )}
        style={{ left: left - 9, top: top + height / 2 - 9, width: 18, height: 18 }}
      >
        <span className="size-3.5 rotate-45 rounded-[3px] bg-brand shadow-glow-sm ring-1 ring-white/25" />
      </div>
    );
  }

  return (
    <div
      data-task-id={task.id}
      className={cn("group absolute z-[15]", dragging && "z-[25]")}
      style={{ left, top: top + 8, width, height: height - 18 }}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label={label}
        title={label}
        onClick={onOpen}
        onKeyDown={onKeyDown}
        onPointerDown={(e) => onPointerDown(e, "move")}
        className={cn(
          "relative size-full cursor-grab overflow-hidden rounded-md ring-1 ring-inset active:cursor-grabbing",
          "transition-shadow duration-fast focus-visible:outline-none focus-visible:shadow-focus",
          toneFor(task, late),
          dragging && "shadow-glow-md"
        )}
      >
        {/* Progress fill sits inside the bar rather than beside it, so
            duration and completion occupy the same space. */}
        <span
          className={cn("absolute inset-y-0 left-0 rounded-l-md", fillFor(task, late))}
          style={{ width: `${pct}%` }}
          aria-hidden="true"
        />
        <span className="relative flex h-full items-center gap-1.5 px-2">
          {width > 64 && (
            <span className="truncate text-[10px] font-medium text-white/90">
              {task.assignees[0]?.name.split(" ")[0]}
            </span>
          )}
          {width > 120 && (
            <span className="ml-auto shrink-0 text-[10px] tabular text-white/70">{pct}%</span>
          )}
        </span>
      </div>

      {/* Resize edges */}
      <span
        role="separator"
        aria-label={`Resize start of ${task.title}`}
        onPointerDown={(e) => {
          e.stopPropagation();
          onPointerDown(e, "resize-start");
        }}
        className="absolute inset-y-0 left-0 w-1.5 cursor-ew-resize rounded-l-md opacity-0
                   transition-opacity group-hover:bg-white/30 group-hover:opacity-100"
      />
      <span
        role="separator"
        aria-label={`Resize end of ${task.title}`}
        onPointerDown={(e) => {
          e.stopPropagation();
          onPointerDown(e, "resize-end");
        }}
        className="absolute inset-y-0 right-0 w-1.5 cursor-ew-resize rounded-r-md opacity-0
                   transition-opacity group-hover:bg-white/30 group-hover:opacity-100"
      />

      {/* Dependency handle — deliberately outside the bar so starting a
          link can never be mistaken for grabbing the edge to resize. */}
      <button
        type="button"
        aria-label={`Draw a dependency from ${task.title}`}
        onPointerDown={(e) => {
          e.stopPropagation();
          onPointerDown(e, "link");
        }}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "absolute -right-3.5 top-1/2 size-2.5 -translate-y-1/2 rounded-full border border-white/40 bg-surface-elevated",
          "transition-opacity focus-visible:opacity-100 focus-visible:outline-none focus-visible:shadow-focus",
          linking ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
      />
    </div>
  );
}

export function BarAvatars({ task }: { task: ProjectTask }) {
  return (
    <span className="flex -space-x-1.5">
      {task.assignees.slice(0, 2).map((a) => (
        <Avatar key={a.id} name={a.name} size="xs" className="ring-1 ring-surface" />
      ))}
    </span>
  );
}
