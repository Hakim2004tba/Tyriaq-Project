import { z } from "zod";

export const timeEntryNoteSchema = z.string().trim().max(500, "Note is too long").optional().or(z.literal(""));

/** For a manual entry (both timestamps known up front) — start_task_timer
 * covers the "start now" case and takes no explicit timestamps, so this
 * schema is only for the manual-entry form. `duration_seconds` is
 * deliberately absent: it's a GENERATED column, never a field a client
 * sets directly. */
export const createManualTimeEntrySchema = z
  .object({
    taskId: z.string().uuid(),
    startedAt: z.string().datetime({ offset: true }),
    endedAt: z.string().datetime({ offset: true }),
    note: timeEntryNoteSchema,
  })
  .refine((data) => data.endedAt >= data.startedAt, {
    message: "End time must be after the start time",
    path: ["endedAt"],
  });
export type CreateManualTimeEntryInput = z.infer<typeof createManualTimeEntrySchema>;

export const updateTimeEntrySchema = z
  .object({
    startedAt: z.string().datetime({ offset: true }).optional(),
    endedAt: z.string().datetime({ offset: true }).optional(),
    note: timeEntryNoteSchema,
  })
  .refine((data) => !data.startedAt || !data.endedAt || data.endedAt >= data.startedAt, {
    message: "End time must be after the start time",
    path: ["endedAt"],
  });
export type UpdateTimeEntryInput = z.infer<typeof updateTimeEntrySchema>;
