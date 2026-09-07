import * as React from "react";
import { Calendar, AlertTriangle, MoreHorizontal, ListChecks, Ban, ChevronRight, MessageSquare, Paperclip } from "lucide-react";
import type { TaskStatus, TaskPriority, TaskWithAssignees, TaskCustomFieldEntry } from "@flow/types";
import { TASK_STATUSES, TASK_PRIORITIES } from "@flow/types";
import { cn, formatRelativeTime } from "@flow/utils";
import { Select, SelectTrigger, SelectContent, SelectItem } from "../select/select";
import { Checkbox } from "../checkbox/checkbox";
import { TaskAssigneeGroup } from "../task-assignee-group/task-assignee-group";
import { TASK_STATUS_CONFIG } from "../task-status/task-status";
import { PRIORITY_CONFIG } from "../priority-badge/priority-badge";
import { IconButton } from "../button/icon-button";
import { formatTaskDate, getDueDateUrgency, DUE_DATE_URGENCY_CLASSES } from "../../lib/task-date";
import { CustomFieldBadge } from "../custom-field-input/custom-field-badge";
import { TagChip } from "../tag-list/tag-list";

const STATUS_PILL_CLASSES: Record<TaskStatus, string> = {
  todo: "bg-surface-muted text-text-secondary",
  in_progress: "bg-info-subtle text-info",
  review: "bg-warning-subtle text-warning",
  done: "bg-success-subtle text-success",
};

/** Shared column template — the header row (TaskListView) and every
 * TaskRow use this exact same grid so columns stay pixel-aligned
 * without either one guessing the other's widths. Order mirrors the
 * approved Phase 03 reference: Task | Assignee | Status | Priority |
 * Due date | Tags | actions. */
export const TASK_TABLE_GRID_COLUMNS =
  "grid-cols-[minmax(0,1fr)_88px_128px_112px_92px_minmax(80px,auto)_28px]";

export interface TaskRowProps {
  task: TaskWithAssignees;
  identifier?: string;
  editable?: boolean;
  /** Shown next to the identifier when the row is rendered in a
   * cross-project context (e.g. My Tasks) — omitted entirely in a
   * single-project task list, where it would be redundant. */
  projectName?: string;
  /** e.g. { completed: 2, total: 5 } — omitted entirely for a task with
   * no subtasks, rather than showing "0/0". Computed by the caller from
   * the same already-loaded task list, never a per-row query. */
  subtaskProgress?: { completed: number; total: number };
  /** True if an incomplete task blocks this one — computed by the
   * caller from a batched dependency query, never a per-row fetch. */
  isBlocked?: boolean;
  /** Real, non-deleted comment count for this task — computed by the
   * caller from a batched project-wide query (getProjectCommentCountsAction),
   * never a per-row fetch, and omitted entirely (not shown as "0")
   * when there are no comments. */
  commentCount?: number;
  /** Real attachment count for this task, same batching contract as
   * commentCount above — omitted when there are no attachments. */
  attachmentCount?: number;
  /** Renders this row indented as a subtask, under its parent — the
   * inline-nesting pattern (not a separate panel). Subtasks never have
   * their own expand toggle (Phase 11's schema enforces one level deep
   * of nesting). */
  indent?: boolean;
  /** Present only on a top-level task that HAS subtasks — renders the
   * expand/collapse chevron. Absent (undefined) on tasks with no
   * subtasks and on subtask rows themselves. */
  expanded?: boolean;
  onToggleExpand?: () => void;
  /** Compact custom field values for this row — computed by the caller
   * from a batched project-wide query (never a per-row fetch), same
   * shape decision as subtaskProgress/isBlocked. Only entries with a
   * non-null value are ever passed in. Rendered as the "Tags" column. */
  customFieldEntries?: TaskCustomFieldEntry[];
  onOpen?: () => void;
  onStatusChange?: (status: TaskStatus) => void;
  onPriorityChange?: (priority: TaskPriority) => void;
}

/** A task as a real table row — CSS grid, not a flex list item, so it
 * lines up exactly under the column header row. Status/priority stay
 * inline-editable selects (brief: "keep interactions fast"), styled as
 * colored pills. The leading checkbox is a fast done/not-done toggle
 * separate from the full status dropdown, matching the Phase 03
 * reference — both write to the same `status` field, no new state. */
export function TaskRow({
  task,
  identifier,
  editable = true,
  projectName,
  subtaskProgress,
  isBlocked,
  commentCount,
  attachmentCount,
  customFieldEntries,
  indent,
  expanded,
  onToggleExpand,
  onOpen,
  onStatusChange,
  onPriorityChange,
}: TaskRowProps) {
  const urgency = task.dueDate ? getDueDateUrgency(task.dueDate) : null;
  const isOverdue = urgency === "overdue";
  const statusConfig = TASK_STATUS_CONFIG[task.status];
  const isDone = task.status === "done";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpen?.();
      }}
      className={cn(
        "group grid items-center gap-3 px-3 py-2.5 text-body-sm transition-colors cursor-pointer hover:bg-surface-muted",
        TASK_TABLE_GRID_COLUMNS
      )}
    >
      {/* Task */}
      <div className={cn("flex min-w-0 items-center gap-2", indent && "pl-7")}>
        {onToggleExpand ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            aria-label={expanded ? "Collapse subtasks" : "Expand subtasks"}
            aria-expanded={expanded}
            className="flex size-5 shrink-0 items-center justify-center rounded text-text-muted hover:bg-surface hover:text-text-primary"
          >
            <ChevronRight className={cn("size-3.5 transition-transform", expanded && "rotate-90")} aria-hidden="true" />
          </button>
        ) : (
          <span className="size-5 shrink-0" aria-hidden="true" />
        )}
        <span onClick={(e) => e.stopPropagation()} className="shrink-0">
          <Checkbox
            checked={isDone}
            onCheckedChange={(checked) => onStatusChange?.(checked ? "done" : "todo")}
            disabled={!editable}
            aria-label={isDone ? "Mark as not done" : "Mark as done"}
          />
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="flex items-baseline gap-2 min-w-0">
            {identifier && <span className="shrink-0 text-caption font-medium text-text-muted">{identifier}</span>}
            {projectName && (
              <span className="shrink-0 truncate rounded bg-surface-muted px-1.5 py-0.5 text-caption text-text-muted">{projectName}</span>
            )}
            <span className={cn("truncate font-medium text-text-primary", isDone && "text-text-muted line-through")}>{task.title}</span>
          </span>
          <span className="flex items-center gap-2.5 text-caption text-text-muted">
            {Boolean(commentCount) && (
              <span className="flex shrink-0 items-center gap-1">
                <MessageSquare className="size-3" aria-hidden="true" />
                {commentCount}
              </span>
            )}
            {Boolean(attachmentCount) && (
              <span className="flex shrink-0 items-center gap-1">
                <Paperclip className="size-3" aria-hidden="true" />
                {attachmentCount}
              </span>
            )}
            {subtaskProgress && subtaskProgress.total > 0 && (
              <span className="flex shrink-0 items-center gap-1">
                <ListChecks className="size-3" aria-hidden="true" />
                {subtaskProgress.completed}/{subtaskProgress.total}
              </span>
            )}
            {isBlocked && (
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-danger-subtle px-1.5 py-0.5 text-danger">
                <Ban className="size-3" aria-hidden="true" />
                Blocked
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Assignee */}
      <TaskAssigneeGroup
        assignees={task.assignees.map((a) => ({ id: a.id, name: a.fullName || "Unnamed", avatarUrl: a.avatarUrl }))}
        max={2}
      />

      {/* Status */}
      <div onClick={(e) => e.stopPropagation()}>
        {editable ? (
          <Select value={task.status} onValueChange={(v) => onStatusChange?.(v as TaskStatus)}>
            <SelectTrigger className="h-auto w-fit gap-1 border-0 bg-transparent p-0 shadow-none focus:ring-0">
              <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-caption font-medium", STATUS_PILL_CLASSES[task.status])}>
                <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
                {statusConfig.label}
              </span>
            </SelectTrigger>
            <SelectContent align="start">
              {TASK_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {TASK_STATUS_CONFIG[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-caption font-medium", STATUS_PILL_CLASSES[task.status])}>
            <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
            {statusConfig.label}
          </span>
        )}
      </div>

      {/* Priority */}
      <div onClick={(e) => e.stopPropagation()}>
        {editable ? (
          <Select value={task.priority} onValueChange={(v) => onPriorityChange?.(v as TaskPriority)}>
            <SelectTrigger className="h-auto w-fit gap-1 border-0 bg-transparent p-0 shadow-none focus:ring-0">
              <PriorityPill priority={task.priority} />
            </SelectTrigger>
            <SelectContent align="start">
              {TASK_PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>
                  {PRIORITY_CONFIG[p].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <PriorityPill priority={task.priority} />
        )}
      </div>

      {/* Due date */}
      <div>
        {task.dueDate ? (
          <span className={cn("flex items-center gap-1 text-caption", urgency ? DUE_DATE_URGENCY_CLASSES[urgency] : "text-text-secondary")}>
            <Calendar className="size-3" aria-hidden="true" />
            {formatTaskDate(task.dueDate)}
            {isOverdue && <AlertTriangle className="size-3" aria-hidden="true" />}
          </span>
        ) : (
          <span className="text-caption text-text-muted">—</span>
        )}
      </div>

      {/* Tags — real tags lead the column, then compact custom field
          badges fill any remaining room. Capped at 3 chips total so a
          heavily-tagged task can't blow out the grid; the full set is
          always visible in Task Detail. */}
      <div className="flex flex-wrap items-center gap-1">
        {task.tags.slice(0, 3).map((tag) => (
          <TagChip key={tag.id} tag={tag} />
        ))}
        {customFieldEntries?.slice(0, Math.max(0, 3 - task.tags.length)).map(({ field, value }) => (
          <CustomFieldBadge key={field.id} field={field} value={value} />
        ))}
        {task.tags.length > 3 && <span className="text-caption text-text-muted">+{task.tags.length - 3}</span>}
      </div>

      {/* Actions */}
      <div onClick={(e) => e.stopPropagation()}>
        <IconButton
          label={`More actions for ${task.title}`}
          variant="ghost"
          className="size-6 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        >
          <MoreHorizontal className="size-3.5" />
        </IconButton>
      </div>
    </div>
  );
}

function PriorityPill({ priority }: { priority: TaskPriority }) {
  const config = PRIORITY_CONFIG[priority];
  const Icon = config.icon;
  if (priority === "none") {
    return <span className="text-caption text-text-muted">—</span>;
  }
  return (
    <span className={cn("inline-flex w-fit items-center gap-1 rounded-full px-2 py-1 text-caption font-medium", config.className)}>
      <Icon className="size-3" aria-hidden="true" />
      {config.label}
    </span>
  );
}
