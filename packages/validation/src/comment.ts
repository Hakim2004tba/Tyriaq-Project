import { z } from "zod";
import { REACTION_EMOJIS } from "@flow/types";

/** Whitespace-only content is rejected — `.trim()` then `.min(1)`
 * catches "   " the same as "". */
export const commentContentSchema = z
  .string()
  .trim()
  .min(1, "Comment can't be empty")
  .max(4000, "Comment is too long");

export const createCommentSchema = z
  .object({
    content: commentContentSchema,
    taskId: z.string().uuid().optional(),
    documentId: z.string().uuid().optional(),
    parentId: z.string().uuid().optional(),
    mentionedUserIds: z.array(z.string().uuid()).default([]),
  })
  .refine((data) => Boolean(data.taskId) !== Boolean(data.documentId), {
    message: "A comment must target exactly one task or document",
    path: ["taskId"],
  });
export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export const updateCommentSchema = z.object({
  content: commentContentSchema,
});
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;

export const toggleReactionSchema = z.object({
  commentId: z.string().uuid(),
  emoji: z.enum(REACTION_EMOJIS),
});
export type ToggleReactionInput = z.infer<typeof toggleReactionSchema>;
