import type { TaskStatus, TaskPriority } from "./index";

export const AUTOMATION_TRIGGER_TYPES = ["task_status_changed", "task_assigned"] as const;
export type AutomationTriggerType = (typeof AUTOMATION_TRIGGER_TYPES)[number];

export const AUTOMATION_ACTION_TYPES = ["set_status", "assign_user", "add_comment"] as const;
export type AutomationActionType = (typeof AUTOMATION_ACTION_TYPES)[number];

/** Matches trigger_type exactly — task_status_changed needs to know
 * WHICH status; task_assigned fires on any assignment, no config
 * needed. Kept as a discriminated union so a future trigger type's
 * config shape is added here, not bolted onto a shared bag of
 * optional fields. */
export type AutomationTriggerConfig = { toStatus: TaskStatus } | Record<string, never>;

/** The one condition type this v1 supports — see migrations README for
 * why cross-task actions and richer conditions are deferred rather
 * than half-built. */
export interface AutomationConditionConfig {
  priority?: TaskPriority;
}

export type AutomationActionConfig =
  | { status: TaskStatus }
  | { userId: string }
  | { comment: string };

/** Mirrors the `automations` table. */
export interface Automation {
  id: string;
  workspaceId: string;
  projectId: string;
  name: string;
  triggerType: AutomationTriggerType;
  triggerConfig: AutomationTriggerConfig;
  conditionConfig: AutomationConditionConfig | null;
  actionType: AutomationActionType;
  actionConfig: AutomationActionConfig;
  enabled: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/** Mirrors the `automation_runs` table — a small execution log so
 * "reliable" is something a user can actually verify, not just a
 * claim. */
export interface AutomationRun {
  id: string;
  automationId: string;
  taskId: string;
  status: "success" | "error";
  errorMessage: string | null;
  ranAt: string;
}
