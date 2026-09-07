import * as React from "react";
import { Zap, UserPlus, MoreHorizontal, ArrowRight } from "lucide-react";
import type { Automation } from "@flow/types";
import { TASK_STATUS_CONFIG } from "../task-status/task-status";
import { PRIORITY_CONFIG } from "../priority-badge/priority-badge";
import { Badge } from "../badge/badge";
import { Switch } from "../switch/switch";
import { IconButton } from "../button/icon-button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "../dropdown-menu/dropdown-menu";

const TRIGGER_META: Record<Automation["triggerType"], { label: string; icon: React.ElementType }> = {
  task_status_changed: { label: "Task status changes", icon: Zap },
  task_assigned: { label: "Task is assigned", icon: UserPlus },
};

const ACTION_LABEL: Record<Automation["actionType"], string> = {
  set_status: "Set status",
  assign_user: "Assign user",
  add_comment: "Add comment",
};

export interface AutomationCardProps {
  automation: Automation;
  runCount: number;
  updatedLabel: string;
  /** Resolves a user id to a display name for the assign_user action —
   * supplied by the caller, since resolving it requires knowing the
   * project's members, which this component has no business fetching. */
  resolveUserName: (userId: string) => string;
  canManage: boolean;
  onToggleEnabled: (enabled: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}

/** One automation, rendered as a scannable WHEN → IF → THEN card — the
 * brief's explicit "each card clearly shows" structure. Purely
 * presentational: no fetching, no Supabase, just the shape a page
 * hands it. */
export function AutomationCard({ automation, runCount, updatedLabel, resolveUserName, canManage, onToggleEnabled, onEdit, onDelete }: AutomationCardProps) {
  const trigger = TRIGGER_META[automation.triggerType];
  const TriggerIcon = trigger.icon;

  const triggerDetail =
    automation.triggerType === "task_status_changed" && "toStatus" in automation.triggerConfig
      ? TASK_STATUS_CONFIG[automation.triggerConfig.toStatus].label
      : null;

  const conditionPriority = automation.conditionConfig?.priority;

  const actionDetail =
    automation.actionType === "set_status" && "status" in automation.actionConfig
      ? TASK_STATUS_CONFIG[automation.actionConfig.status].label
      : automation.actionType === "assign_user" && "userId" in automation.actionConfig
        ? resolveUserName(automation.actionConfig.userId)
        : automation.actionType === "add_comment" && "comment" in automation.actionConfig
          ? `"${automation.actionConfig.comment}"`
          : null;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-subtle text-primary">
            <TriggerIcon className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-body-sm font-semibold text-text-primary">{automation.name}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className="text-caption font-medium text-text-muted">When</span>
              <Badge variant="neutral">{trigger.label}</Badge>
              {triggerDetail && (
                <>
                  <span className="text-caption text-text-muted">to</span>
                  <Badge variant="neutral">{triggerDetail}</Badge>
                </>
              )}
              <ArrowRight className="size-3 text-text-muted" aria-hidden="true" />
              <span className="text-caption font-medium text-text-muted">Then</span>
              <Badge variant="neutral">{ACTION_LABEL[automation.actionType]}</Badge>
              {actionDetail && <Badge variant="neutral">{actionDetail}</Badge>}
            </div>
            {conditionPriority && (
              <p className="mt-1 text-caption text-text-muted">
                Only if priority is <span className="font-medium text-text-secondary">{PRIORITY_CONFIG[conditionPriority].label}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Badge variant={automation.enabled ? "success" : "neutral"}>{automation.enabled ? "Active" : "Inactive"}</Badge>
          {canManage && (
            <>
              <Switch
                checked={automation.enabled}
                onCheckedChange={onToggleEnabled}
                aria-label={`${automation.enabled ? "Disable" : "Enable"} ${automation.name}`}
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <IconButton label="Automation actions" variant="ghost" className="size-7">
                    <MoreHorizontal className="size-4" />
                  </IconButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={onEdit}>Edit</DropdownMenuItem>
                  <DropdownMenuItem destructive onSelect={onDelete}>
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 text-caption text-text-muted">
        <span>
          Runs {runCount} time{runCount === 1 ? "" : "s"}
        </span>
        <span aria-hidden="true">·</span>
        <span>Updated {updatedLabel}</span>
      </div>
    </div>
  );
}
