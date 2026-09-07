import { z } from "zod";
import { PROJECT_COLORS } from "@flow/types";

export const projectNameSchema = z
  .string()
  .trim()
  .min(1, "Project name is required")
  .max(80, "Project name is too long");

export const projectDescriptionSchema = z
  .string()
  .trim()
  .max(280, "Description is too long")
  .optional()
  .or(z.literal(""));

/** Lowercase letters, numbers, and hyphens only; unique within a workspace. */
export const projectSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "URL is required")
  .max(60, "URL is too long")
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "URL can only contain lowercase letters, numbers, and hyphens");

/** A single emoji or short glyph — kept short rather than validated
 * against a fixed icon set, since the icon is just a display label. */
export const projectIconSchema = z.string().trim().max(8, "Icon is too long").optional().or(z.literal(""));

export const projectColorSchema = z.enum(PROJECT_COLORS);

export const createProjectSchema = z.object({
  name: projectNameSchema,
  slug: projectSlugSchema,
  description: projectDescriptionSchema,
  icon: projectIconSchema,
  color: projectColorSchema,
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const createProjectFromTemplateSchema = z.object({
  templateId: z.string().uuid(),
  name: projectNameSchema,
  slug: projectSlugSchema,
});
export type CreateProjectFromTemplateInput = z.infer<typeof createProjectFromTemplateSchema>;

export const updateProjectSchema = z.object({
  name: projectNameSchema,
  description: projectDescriptionSchema,
  icon: projectIconSchema,
  color: projectColorSchema,
});
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
