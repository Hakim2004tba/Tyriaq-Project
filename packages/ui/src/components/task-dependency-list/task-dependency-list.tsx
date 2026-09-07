import * as React from "react";
import { Ban, Link2, X, Plus } from "lucide-react";
import { Circle, CircleDot, CircleDashed, CircleCheck } from "lucide-react";
import type { TaskDependencySummary, DependencyType, TaskStatus as TaskStatusValue } from "@flow/types";
import { cn } from "@flow/utils";
import { Select, SelectTrigger, SelectContent, SelectItem } from "../select/select";
import { IconButton } from "../button/icon-button";
import { Badge } from "../badge/badge";

const STATUS_ICONS = { todo: Circle, in_progress: CircleDot, review: CircleDashed, done: CircleCheck } as const;
const STATUS_ICON_CLASSES: Record<TaskStatusValue, string> = {
  todo: "text-text-muted",
  in_progress: "text-primary",
  review: "text-warning",
  done: "text-success",
};

export interface DependencyCandidate {
  id: string;
  title: string;
}

export interface TaskDependencyListProps {
  dependencies: TaskDependencySummary[];
  canManage: boolean;
  /** Other tasks the viewer can link to — kept intentionally simple
   * (same-project tasks passed in by the caller) rather than a new
   * cross-project search UI; the database itself supports cross-project
   * links, this picker just doesn't expose that yet (see Phase 14
   * report). */
  candidates: DependencyCandidate[];
  onOpenTask: (taskId: string) => void;
  onAdd: (relatedTaskId: string, type: DependencyType) => void;
  onRemove: (dependencyId: string) => void;
}

const SECTION_CONFIG: Record<TaskDependencySummary["direction"], { label: string; icon: React.ElementType }> = {
  blocking: { label: "Blocking", icon: Ban },
  blocked_by: { label: "Blocked by", icon: Ban },
  related: { label: "Related to", icon: Link2 },
};

/** A task's dependency links, grouped by how they read from THIS task's
 * point of view — "Blocking" / "Blocked by" / "Related to". Purely
 * presentational: fetching/mutating and cycle-prevention all live in
 * the database and the caller's data layer, not here. */
export function TaskDependencyList({ dependencies, canManage, candidates, onOpenTask, onAdd, onRemove }: TaskDependencyListProps) {
  const [addingType, setAddingType] = React.useState<DependencyType | null>(null);

  const blocking = dependencies.filter((d) => d.direction === "blocking");
  const blockedBy = dependencies.filter((d) => d.direction === "blocked_by");
  const related = dependencies.filter((d) => d.direction === "related");

  const isBlocked = blockedBy.some((d) => d.task.status !== "done");

  return (
    <div className="flex flex-col gap-3">
      {isBlocked && (
        <Badge variant="danger" className="w-fit">
          Blocked
        </Badge>
      )}

      {(["blocked_by", "blocking", "related"] as const).map((direction) => {
        const items = direction === "blocked_by" ? blockedBy : direction === "blocking" ? blocking : related;
        if (items.length === 0) return null;
        const { label, icon: Icon } = SECTION_CONFIG[direction];
        return (
          <div key={direction} className="flex flex-col gap-1.5">
            <span className="flex items-center gap-1.5 text-caption font-medium text-text-muted">
              <Icon className="size-3" aria-hidden="true" />
              {label}
            </span>
            <div className="flex flex-col divide-y divide-border rounded-md border border-border">
              {items.map((dep) => {
                const StatusIcon = STATUS_ICONS[dep.task.status];
                return (
                  <div key={dep.dependencyId} className="flex items-center gap-2 px-2.5 py-2">
                    <StatusIcon className={cn("size-3.5 shrink-0", STATUS_ICON_CLASSES[dep.task.status])} aria-hidden="true" />
                    <button
                      type="button"
                      onClick={() => onOpenTask(dep.task.id)}
                      className="min-w-0 flex-1 truncate text-left text-body-sm text-text-primary hover:text-primary"
                    >
                      {dep.task.title}
                    </button>
                    {dep.canRemove && (
                      <IconButton
                        label={`Remove dependency on "${dep.task.title}"`}
                        variant="ghost"
                        className="size-6 shrink-0"
                        onClick={() => onRemove(dep.dependencyId)}
                      >
                        <X className="size-3.5" />
                      </IconButton>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {canManage && candidates.length > 0 && (
        <div className="flex items-center gap-2">
          {addingType ? (
            <Select
              value=""
              onValueChange={(taskId) => {
                onAdd(taskId, addingType);
                setAddingType(null);
              }}
            >
              <SelectTrigger className="h-8 text-body-sm">
                <span className="text-text-muted">Select a task…</span>
              </SelectTrigger>
              <SelectContent>
                {candidates.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setAddingType("blocks")}
                className="flex items-center gap-1 text-caption font-medium text-text-muted hover:text-text-primary"
              >
                <Plus className="size-3.5" /> Blocking
              </button>
              <button
                type="button"
                onClick={() => setAddingType("related")}
                className="flex items-center gap-1 text-caption font-medium text-text-muted hover:text-text-primary"
              >
                <Plus className="size-3.5" /> Related
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
