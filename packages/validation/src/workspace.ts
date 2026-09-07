import { z } from "zod";

export const workspaceNameSchema = z
  .string()
  .trim()
  .min(2, "Workspace name must be at least 2 characters")
  .max(60, "Workspace name is too long");

/** Lowercase letters, numbers, and hyphens only; no leading/trailing hyphen. */
export const workspaceSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, "URL must be at least 2 characters")
  .max(48, "URL is too long")
  .regex(
    /^[a-z0-9]+(-[a-z0-9]+)*$/,
    "URL can only contain lowercase letters, numbers, and hyphens"
  );

export const createWorkspaceSchema = z.object({
  name: workspaceNameSchema,
  slug: workspaceSlugSchema,
});
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
