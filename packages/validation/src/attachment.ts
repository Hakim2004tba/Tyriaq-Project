import { z } from "zod";

/** Matches the Storage bucket's own limit (see
 * supabase/migrations/20260819170500_attachments_storage.sql) — checked
 * client-side too so a user gets an immediate, friendly message instead
 * of waiting for the upload to fail. */
export const MAX_ATTACHMENT_SIZE_BYTES = 25 * 1024 * 1024;

export const attachmentFileNameSchema = z
  .string()
  .trim()
  .min(1, "File name is required")
  .max(255, "File name is too long");

export const createAttachmentSchema = z
  .object({
    fileName: attachmentFileNameSchema,
    mimeType: z.string().max(255).optional(),
    fileSize: z
      .number()
      .int()
      .positive()
      .max(MAX_ATTACHMENT_SIZE_BYTES, "File is larger than the 25 MB limit"),
    taskId: z.string().uuid().optional(),
    documentId: z.string().uuid().optional(),
  })
  .refine((data) => Boolean(data.taskId) !== Boolean(data.documentId), {
    message: "An attachment must target exactly one task or document",
    path: ["taskId"],
  });
export type CreateAttachmentInput = z.infer<typeof createAttachmentSchema>;
