import { z } from "zod";
import { AUTOMATION_TRIGGER_TYPES, AUTOMATION_ACTION_TYPES, TASK_STATUSES, TASK_PRIORITIES } from "@flow/types";

export const automationNameSchema = z.string().trim().min(1, "Name is required").max(80, "Name is too long");

export const createAutomationSchema = z
  .object({
    name: automationNameSchema,
    triggerType: z.enum(AUTOMATION_TRIGGER_TYPES),
    triggerToStatus: z.enum(TASK_STATUSES).optional(),
    conditionPriority: z.enum(TASK_PRIORITIES).optional(),
    actionType: z.enum(AUTOMATION_ACTION_TYPES),
    actionStatus: z.enum(TASK_STATUSES).optional(),
    actionUserId: z.string().uuid().optional(),
    actionComment: z.string().trim().max(1000).optional(),
  })
  .refine((data) => data.triggerType !== "task_status_changed" || Boolean(data.triggerToStatus), {
    message: "Choose which status should trigger this automation",
    path: ["triggerToStatus"],
  })
  .refine((data) => data.actionType !== "set_status" || Boolean(data.actionStatus), {
    message: "Choose the status to set",
    path: ["actionStatus"],
  })
  .refine((data) => data.actionType !== "assign_user" || Boolean(data.actionUserId), {
    message: "Choose who to assign",
    path: ["actionUserId"],
  })
  .refine((data) => data.actionType !== "add_comment" || Boolean(data.actionComment?.trim()), {
    message: "Write the comment to post",
    path: ["actionComment"],
  });
export type CreateAutomationInput = z.infer<typeof createAutomationSchema>;
