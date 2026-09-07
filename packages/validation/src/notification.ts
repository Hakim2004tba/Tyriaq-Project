import { z } from "zod";

/**
 * The ONLY user-controlled notification operation in this phase is
 * marking notification(s) as read — there is no createNotificationAction
 * (notifications are generated exclusively by database triggers, see
 * supabase/migrations/README.md) and no schema here could ever touch
 * `type`/`actorUserId`/`entityId`/etc, because no client-facing mutation
 * exists that would accept them. `mark_notifications_read` on the
 * database side already restricts itself to `read_at` and to the
 * caller's own rows (`recipient_user_id = auth.uid()`); this schema's
 * job is just validating the shape of the id list before it reaches
 * that RPC, not re-implementing that authorization.
 */
export const markNotificationsReadSchema = z.object({
  /** Omit (or pass an empty/undefined array) to mark everything unread
   * as read — mirrors the RPC's own `p_notification_ids default null`
   * behavior. When provided, every id must be a real UUID. */
  notificationIds: z.array(z.string().uuid()).optional(),
});
export type MarkNotificationsReadInput = z.infer<typeof markNotificationsReadSchema>;
