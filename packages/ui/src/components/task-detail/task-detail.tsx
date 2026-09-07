import * as React from "react";
import { Circle, CircleDot, CircleDashed, CircleCheck, UserPlus, X } from "lucide-react";
import type {
  TaskStatus,
  TaskPriority,
  TaskWithAssignees,
  CommentThread as CommentThreadData,
  ActivityEventWithActor,
  AttachmentWithUploader,
  TaskTimeSummary,
  TaskTimeEntryWithUser,
  SubtaskSummary,
  TaskDependencySummary,
  DependencyType,
  TaskCustomFieldEntry,
  CustomFieldValue,
  Tag,
} from "@flow/types";
import { TASK_STATUSES, TASK_PRIORITIES } from "@flow/types";
import { cn } from "@flow/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody } from "../sheet/sheet";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "../select/select";
import { Textarea } from "../textarea/textarea";
import { Input } from "../input/input";
import { Label } from "../label/label";
import { Avatar } from "../avatar/avatar";
import { IconButton } from "../button/icon-button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "../dropdown-menu/dropdown-menu";
import { TASK_STATUS_CONFIG } from "../task-status/task-status";
import { PRIORITY_CONFIG } from "../priority-badge/priority-badge";
import { Divider } from "../divider/divider";
import { CollaborationPanel, type CollaborationPanelProps } from "../collaboration-panel/collaboration-panel";
import { TimeTracker } from "../time-tracker/time-tracker";
import { TimeEntryList } from "../time-entry-list/time-entry-list";
import { SubtaskList } from "../subtask-list/subtask-list";
import { TagList } from "../tag-list/tag-list";
import { TimeEstimateField } from "./time-estimate-field";
import { TaskDependencyList, type DependencyCandidate } from "../task-dependency-list/task-dependency-list";
import { CustomFieldInput } from "../custom-field-input/custom-field-input";

const STATUS_ICONS = { todo: Circle, in_progress: CircleDot, review: CircleDashed, done: CircleCheck } as const;

export interface TaskDetailUser {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

export interface TaskDetailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "overlay" (default): the original Sheet-based dimming drawer,
   * used wherever Task Detail is opened from a context with no room
   * for a permanent side column (e.g. narrow screens). "docked": the
   * exact same header/body content, rendered as a plain in-flow panel
   * instead — for List/Board/Calendar/Timeline, which have a
   * dedicated column reserved for it, matching a real professional
   * work-management layout (list + detail visible together, nothing
   * dimmed). Same component, same state, same content either way —
   * just a different outer wrapper. */
  variant?: "overlay" | "docked";
  task: TaskWithAssignees;
  identifier?: string;
  /** Whether the current viewer can edit this task (can_manage_tasks). */
  editable: boolean;
  assignableUsers: TaskDetailUser[];
  creator?: TaskDetailUser | null;
  onTitleChange?: (title: string) => void;
  onDescriptionChange?: (description: string) => void;
  onStatusChange?: (status: TaskStatus) => void;
  onPriorityChange?: (priority: TaskPriority) => void;
  onStartDateChange?: (date: string | null) => void;
  onDueDateChange?: (date: string | null) => void;
  onToggleAssignee?: (userId: string) => void;
  /** Comments/Activity/Files — omitted entirely (not rendered as a
   * placeholder) if the caller doesn't supply `collaboration`, so a
   * consumer that hasn't wired this up yet still gets a working
   * TaskDetail rather than a broken one. */
  collaboration?: Omit<CollaborationPanelProps, "threads" | "activityEvents" | "attachments"> & {
    threads: CommentThreadData[];
    activityEvents: ActivityEventWithActor[];
    attachments: AttachmentWithUploader[];
  };
  /** Omitted entirely (not rendered as a placeholder) if the caller
   * hasn't wired time tracking — same pattern as `collaboration`. */
  timeTracking?: {
    summary: TaskTimeSummary;
    entries: TaskTimeEntryWithUser[];
    canTrack: boolean;
    canManageEntry: (entry: TaskTimeEntryWithUser) => boolean;
    onStart: () => void;
    onStop: () => void;
    onAddManualEntry?: () => void;
    onEditEntry: (entry: TaskTimeEntryWithUser) => void;
    onDeleteEntry: (entry: TaskTimeEntryWithUser) => void;
  };
  /** Omitted entirely if the caller hasn't wired subtasks — same
   * "no placeholder" pattern as `collaboration`/`timeTracking`. */
  subtasks?: {
    items: SubtaskSummary[];
    canManage: boolean;
    onOpen: (subtask: SubtaskSummary) => void;
    onToggleComplete: (subtask: SubtaskSummary) => void;
    onAdd: (title: string) => void;
  };
  /** Omitted entirely if the caller hasn't wired dependencies — same
   * pattern as subtasks/timeTracking/collaboration. */
  dependencies?: {
    items: TaskDependencySummary[];
    canManage: boolean;
    candidates: DependencyCandidate[];
    onOpenTask: (taskId: string) => void;
    onAdd: (relatedTaskId: string, type: DependencyType) => void;
    onRemove: (dependencyId: string) => void;
  };
  /** Omitted entirely if the caller hasn't wired tags — same pattern
   * as subtasks/dependencies/timeTracking. */
  tags?: {
    items: Tag[];
    available: Tag[];
    canManage: boolean;
    onAdd: (name: string) => void;
    onAttach: (tag: Tag) => void;
    onRemove: (tag: Tag) => void;
  };
  /** Called with the new estimate in MINUTES, or null to clear it. */
  onTimeEstimateChange?: (minutes: number | null) => void;
  /** Omitted entirely if the caller hasn't wired custom fields — same
   * pattern as subtasks/dependencies/timeTracking. */
  customFields?: {
    entries: TaskCustomFieldEntry[];
    canManage: boolean;
    onChange: (fieldId: string, fieldType: string, value: CustomFieldValue) => void;
  };
}

/**
 * Task Detail side panel. Comments/Activity/Files render via the shared
 * CollaborationPanel when the caller supplies `collaboration` data —
 * this component itself never calls Supabase or fetches anything; all
 * data and mutation callbacks come in as props (see apps/web's
 * TasksTab/task-detail-container for where that data actually comes
 * from). Decisions remains explicitly out of scope.
 */
export function TaskDetail({
  open,
  onOpenChange,
  variant = "overlay",
  task,
  identifier,
  editable,
  assignableUsers,
  creator,
  onTitleChange,
  onDescriptionChange,
  onStatusChange,
  onPriorityChange,
  onStartDateChange,
  onDueDateChange,
  onToggleAssignee,
  collaboration,
  timeTracking,
  subtasks,
  tags,
  onTimeEstimateChange,
  dependencies,
  customFields,
}: TaskDetailProps) {
  const [title, setTitle] = React.useState(task.title);
  const [description, setDescription] = React.useState(task.description ?? "");

  React.useEffect(() => setTitle(task.title), [task.id, task.title]);
  React.useEffect(() => setDescription(task.description ?? ""), [task.id, task.description]);

  const assigneeIds = new Set(task.assignees.map((a) => a.userId));

  const headerContent = (
    <>
      {identifier && <span className="text-caption text-text-muted">{identifier}</span>}
      {editable ? (
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title.trim() && title !== task.title && onTitleChange?.(title.trim())}
          className="w-full bg-transparent text-h4 text-text-primary outline-none pr-8"
          aria-label="Task title"
        />
      ) : (
        <SheetTitle>{task.title}</SheetTitle>
      )}
    </>
  );

  const bodyContent = (
    <>
      <div className="grid grid-cols-2 gap-4">
            <PropertyField label="Status">
              {editable ? (
                <Select value={task.status} onValueChange={(v) => onStatusChange?.(v as TaskStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        <span className="flex items-center gap-2">
                          {React.createElement(STATUS_ICONS[s], { className: cn("size-3.5", TASK_STATUS_CONFIG[s].className) })}
                          {TASK_STATUS_CONFIG[s].label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <ReadOnlyValue>{TASK_STATUS_CONFIG[task.status].label}</ReadOnlyValue>
              )}
            </PropertyField>

            <PropertyField label="Priority">
              {editable ? (
                <Select value={task.priority} onValueChange={(v) => onPriorityChange?.(v as TaskPriority)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {PRIORITY_CONFIG[p].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <ReadOnlyValue>{PRIORITY_CONFIG[task.priority].label}</ReadOnlyValue>
              )}
            </PropertyField>

            <PropertyField label="Start date">
              <Input
                type="date"
                value={task.startDate ?? ""}
                disabled={!editable}
                onChange={(e) => onStartDateChange?.(e.target.value || null)}
              />
            </PropertyField>

            <PropertyField label="Due date">
              <Input
                type="date"
                value={task.dueDate ?? ""}
                disabled={!editable}
                onChange={(e) => onDueDateChange?.(e.target.value || null)}
              />
            </PropertyField>

            <PropertyField label="Time estimate">
              <TimeEstimateField
                minutes={task.timeEstimateMinutes}
                disabled={!editable}
                onChange={(next) => onTimeEstimateChange?.(next)}
              />
            </PropertyField>

            {tags && (
              <PropertyField label="Tags" className="col-span-2">
                <TagList
                  tags={tags.items}
                  available={tags.available}
                  canManage={tags.canManage}
                  onAdd={tags.onAdd}
                  onAttach={tags.onAttach}
                  onRemove={tags.onRemove}
                />
              </PropertyField>
            )}

            <PropertyField label="Assignees" className="col-span-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {task.assignees.map((a) => (
                  <span
                    key={a.id}
                    className="flex items-center gap-1.5 rounded-full bg-surface-muted py-0.5 pl-0.5 pr-2.5 text-caption text-text-secondary"
                  >
                    <Avatar name={a.fullName || "Unnamed"} src={a.avatarUrl} size="xs" />
                    {a.fullName || "Unnamed"}
                  </span>
                ))}
                {editable && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <IconButton label="Edit assignees">
                        <UserPlus className="size-4" />
                      </IconButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      <DropdownMenuLabel>Assign to</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {assignableUsers.map((u) => (
                        <DropdownMenuCheckboxItem
                          key={u.id}
                          checked={assigneeIds.has(u.id)}
                          onSelect={(e) => e.preventDefault()}
                          onCheckedChange={() => onToggleAssignee?.(u.id)}
                        >
                          <span className="flex items-center gap-2">
                            <Avatar name={u.name} src={u.avatarUrl} size="xs" />
                            {u.name}
                          </span>
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </PropertyField>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-description">Description</Label>
            {editable ? (
              <Textarea
                id="task-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => onDescriptionChange?.(description)}
                placeholder="Add more detail…"
                rows={5}
              />
            ) : (
              <p className="text-body-sm text-text-secondary whitespace-pre-wrap">
                {task.description || "No description."}
              </p>
            )}
          </div>

          {customFields && customFields.entries.length > 0 && (
            <div className="flex flex-col gap-3">
              <span className="text-label text-text-secondary">Custom fields</span>
              <div className="flex flex-col gap-2.5">
                {customFields.entries.map(({ field, value }) => (
                  <div key={field.id} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 truncate text-body-sm text-text-muted">{field.name}</span>
                    <div className="min-w-0 flex-1">
                      <CustomFieldInput
                        field={field}
                        value={value}
                        disabled={!customFields.canManage}
                        onChange={(next) => customFields.onChange(field.id, field.fieldType, next)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Divider />

          <div className="flex flex-col gap-1.5 text-caption text-text-muted">
            {creator && <span>Created by {creator.name}</span>}
            <span>Created {new Date(task.createdAt).toLocaleDateString()}</span>
            <span>Updated {new Date(task.updatedAt).toLocaleDateString()}</span>
          </div>

          {subtasks && (
            <div className="flex flex-col gap-2">
              <span className="text-label text-text-secondary">Subtasks</span>
              <SubtaskList
                subtasks={subtasks.items}
                canManage={subtasks.canManage}
                onOpenSubtask={subtasks.onOpen}
                onToggleComplete={subtasks.onToggleComplete}
                onAddSubtask={subtasks.onAdd}
              />
            </div>
          )}

          {dependencies && (
            <div className="flex flex-col gap-2">
              <span className="text-label text-text-secondary">Dependencies</span>
              <TaskDependencyList
                dependencies={dependencies.items}
                canManage={dependencies.canManage}
                candidates={dependencies.candidates}
                onOpenTask={dependencies.onOpenTask}
                onAdd={dependencies.onAdd}
                onRemove={dependencies.onRemove}
              />
            </div>
          )}

          {timeTracking && (
            <div className="flex flex-col gap-3">
              <TimeTracker
                summary={timeTracking.summary}
                canTrack={timeTracking.canTrack}
                onStart={timeTracking.onStart}
                onStop={timeTracking.onStop}
                onAddManualEntry={timeTracking.onAddManualEntry}
              />
              <TimeEntryList
                entries={timeTracking.entries}
                canManage={timeTracking.canManageEntry}
                onEdit={timeTracking.onEditEntry}
                onDelete={timeTracking.onDeleteEntry}
              />
            </div>
          )}

          {collaboration && <CollaborationPanel {...collaboration} />}
    </>
  );

  if (variant === "docked") {
    if (!open) return null;
    return (
      <div className="relative flex max-h-[calc(100vh-8rem)] w-full max-w-lg flex-col overflow-hidden rounded-lg border border-border bg-surface">
        <div className="flex flex-col gap-1 border-b border-border p-5">
          {headerContent}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close panel"
            className="absolute right-4 top-4 rounded-sm text-text-muted transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-5">{bodyContent}</div>
      </div>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent width="lg">
        <SheetHeader>{headerContent}</SheetHeader>
        <SheetBody className="flex flex-col gap-6">{bodyContent}</SheetBody>
      </SheetContent>
    </Sheet>
  );
}

function PropertyField({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-label text-text-muted">{label}</span>
      {children}
    </div>
  );
}

function ReadOnlyValue({ children }: { children: React.ReactNode }) {
  return <span className="text-body-sm text-text-primary">{children}</span>;
}
