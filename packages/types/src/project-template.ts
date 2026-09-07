import type { TaskStatus, TaskPriority } from "./index";
import type { ProjectColor } from "./project";
import type { CustomFieldType, CustomFieldOption } from "./custom-field";
import type {
  AutomationTriggerType,
  AutomationTriggerConfig,
  AutomationConditionConfig,
  AutomationActionType,
  AutomationActionConfig,
} from "./automation";

export const TEMPLATE_SCOPES = ["system", "workspace"] as const;
export type TemplateScope = (typeof TEMPLATE_SCOPES)[number];

/** Mirrors the `project_templates` table. `workspaceId: null` = a
 * system starter template, available everywhere. */
export interface ProjectTemplate {
  id: string;
  workspaceId: string | null;
  scope: TemplateScope;
  name: string;
  description: string | null;
  icon: string | null;
  color: ProjectColor;
  defaultView: "list" | "board" | "calendar" | "timeline";
  createdBy: string | null;
  createdAt: string;
}

export interface ProjectTemplateTask {
  id: string;
  templateId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  position: number;
}

export interface ProjectTemplateCustomField {
  id: string;
  templateId: string;
  name: string;
  fieldType: CustomFieldType;
  options: CustomFieldOption[] | null;
  position: number;
}

export interface ProjectTemplateDoc {
  id: string;
  templateId: string;
  title: string;
  content: Record<string, unknown>;
  position: number;
}

export interface ProjectTemplateAutomation {
  id: string;
  templateId: string;
  name: string;
  triggerType: AutomationTriggerType;
  triggerConfig: AutomationTriggerConfig;
  conditionConfig: AutomationConditionConfig | null;
  actionType: AutomationActionType;
  actionConfig: AutomationActionConfig;
}

/** The shape a template picker actually renders: the template plus
 * enough counts to describe what it contains, resolved by the data
 * layer via a batched count query, not fetched-then-counted by the UI. */
export interface ProjectTemplateSummary extends ProjectTemplate {
  taskCount: number;
  customFieldCount: number;
  docCount: number;
  automationCount: number;
}
