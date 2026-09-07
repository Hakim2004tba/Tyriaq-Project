import { z } from "zod";
import { TASK_STATUSES, TASK_PRIORITIES, DEPENDENCY_TYPES, TAG_COLORS } from "@flow/types";

export const taskTitleSchema = z
  .string()
  .trim()
  .min(1, "Title is required")
  .max(200, "Title is too long");

export const taskDescriptionSchema = z
  .string()
  .trim()
  .max(4000, "Description is too long")
  .optional()
  .or(z.literal(""));

export const taskStatusSchema = z.enum(TASK_STATUSES);
export const taskPrioritySchema = z.enum(TASK_PRIORITIES);

/** ISO date string ("YYYY-MM-DD"), or empty/undefined for "not set". */
const optionalDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date")
  .optional()
  .or(z.literal(""));

export const createTaskObjectSchema = z.object({
  title: taskTitleSchema,
  description: taskDescriptionSchema,
  status: taskStatusSchema.default("todo"),
  priority: taskPrioritySchema.default("none"),
  startDate: optionalDateSchema,
  dueDate: optionalDateSchema,
  assigneeIds: z.array(z.string().uuid()).default([]),
});

function dueAfterStart<T extends { startDate?: string; dueDate?: string }>(data: T) {
  if (!data.startDate || !data.dueDate) return true;
  return data.dueDate >= data.startDate;
}

export const createTaskSchema = createTaskObjectSchema.refine(dueAfterStart, {
  message: "Due date must be on or after the start date",
  path: ["dueDate"],
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

/** Minimal — a subtask's project/parent come from context (the open
 * task), never from user input; only the title is actually typed. */
export const createSubtaskSchema = z.object({
  title: taskTitleSchema,
});
export type CreateSubtaskInput = z.infer<typeof createSubtaskSchema>;

export const createDependencySchema = z.object({
  relatedTaskId: z.string().uuid(),
  dependencyType: z.enum(DEPENDENCY_TYPES),
});
export type CreateDependencyInput = z.infer<typeof createDependencySchema>;

/** Effort estimate in whole minutes. `null` clears the estimate; the
 * DB check constraint rejects 0 and anything over 100000 hours, so the
 * bounds here mirror it exactly rather than inventing a second, looser
 * rule the database would then reject at write time. */
export const timeEstimateMinutesSchema = z
  .number()
  .int("Enter a whole number of minutes")
  .positive("An estimate must be greater than zero")
  .max(6000000, "That estimate is too large")
  .nullable()
  .optional();

export const updateTaskObjectSchema = z.object({
  title: taskTitleSchema,
  description: taskDescriptionSchema,
  status: taskStatusSchema,
  priority: taskPrioritySchema,
  startDate: optionalDateSchema,
  dueDate: optionalDateSchema,
  timeEstimateMinutes: timeEstimateMinutesSchema,
});

export const tagNameSchema = z
  .string()
  .trim()
  .min(1, "Tag name is required")
  .max(40, "Tag name is too long");

export const createTagSchema = z.object({
  name: tagNameSchema,
  color: z.enum(TAG_COLORS).default("neutral"),
});
export type CreateTagInput = z.infer<typeof createTagSchema>;

export const updateTaskSchema = updateTaskObjectSchema.refine(dueAfterStart, {
  message: "Due date must be on or after the start date",
  path: ["dueDate"],
});
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
