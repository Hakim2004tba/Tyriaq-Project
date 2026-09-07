import { z } from "zod";

export const documentTitleSchema = z
  .string()
  .trim()
  .min(1, "Title is required")
  .max(200, "Title is too long");

export const documentSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "URL is required")
  .max(80, "URL is too long")
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "URL can only contain lowercase letters, numbers, and hyphens");

export const documentIconSchema = z.string().trim().max(8, "Icon is too long").optional().or(z.literal(""));

/** Loose validation of the Tiptap/ProseMirror JSON shape — just enough
 * to reject obviously malformed content before it reaches the database,
 * not a full schema of every node/mark type (that's the editor's job). */
export const documentContentSchema = z.object({
  type: z.literal("doc"),
  content: z.array(z.unknown()).optional(),
});

export const createDocumentSchema = z.object({
  title: documentTitleSchema,
  slug: documentSlugSchema,
  workspaceId: z.string().uuid(),
  projectId: z.string().uuid().nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
  icon: documentIconSchema,
});
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;

export const updateDocumentSchema = z.object({
  title: documentTitleSchema.optional(),
  content: documentContentSchema.optional(),
  icon: documentIconSchema,
});
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
