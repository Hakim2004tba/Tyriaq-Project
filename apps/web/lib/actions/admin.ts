"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPlatformAdmin } from "@/lib/auth/session";
import type { ActionResult } from "./workspace";

/**
 * What staff can do, and the record that they did it.
 *
 * Every function here checks `isPlatformAdmin()` first. The admin ROUTE
 * is gated too, but a Server Action is an endpoint of its own — anybody
 * who knows its name can call it without ever loading the page, so the
 * page's gate protects nothing on its own.
 *
 * Each one writes an audit row through the ordinary session client, so
 * the entry carries who did it. The work itself uses the service-role
 * client, because it reaches across workspaces.
 */

async function staffOnly(): Promise<string | null> {
  return (await isPlatformAdmin()) ? null : "Not allowed.";
}

/** Writes the audit row as the caller, so `actor_id` is really them. */
async function record(
  action: string,
  kind: string,
  target: string | null,
  targetId?: string | null,
  detail?: string
): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.rpc("record_admin_action", {
      p_action: action,
      p_kind: kind,
      p_target: target,
      p_target_id: targetId ?? null,
      p_result: "success",
      p_detail: detail ?? null,
    });
  } catch (error) {
    // An unrecorded action is bad; a failed action because recording
    // failed is worse.
    console.error("[tyriaq] could not record an admin action:", error);
  }
}

/* ------------------------------------------------------------------ */
/* Users                                                               */
/* ------------------------------------------------------------------ */

/**
 * Suspends or restores an account.
 *
 * Supabase expresses a ban as a duration, so "forever" is a long one and
 * lifting it is a duration of zero. Nothing is deleted: a suspended
 * person keeps everything they wrote, and can be let back in.
 */
export async function setUserSuspended(
  userId: string,
  suspended: boolean
): Promise<ActionResult> {
  const refused = await staffOnly();
  if (refused) return { error: refused };

  const supabase = createAdminClient();
  if (!supabase) return { error: "The service-role key is not configured." };

  const { error } = await supabase.auth.admin.updateUserById(userId, {
    ban_duration: suspended ? "876000h" : "none",
  });
  if (error) return { error: error.message };

  await record(
    suspended ? "Suspended a user" : "Restored a user",
    "user",
    userId,
    userId
  );
  revalidatePath("/admin/users");
  return { message: suspended ? "Account suspended." : "Account restored." };
}

/* ------------------------------------------------------------------ */
/* Subscriptions                                                       */
/* ------------------------------------------------------------------ */

/**
 * Moves a workspace onto a plan.
 *
 * This is the function a payment provider's webhook will eventually
 * call. Until there is one, it is how a paid workspace is turned on
 * after a transfer arrives — which is the actual billing process today,
 * written down rather than pretended away.
 */
export async function setWorkspacePlan(input: {
  workspaceId: string;
  planId: string;
  status?: "trialing" | "active" | "past_due" | "cancelled";
  seats?: number;
  renewsAt?: string | null;
}): Promise<ActionResult> {
  const refused = await staffOnly();
  if (refused) return { error: refused };

  const supabase = createAdminClient();
  if (!supabase) return { error: "The service-role key is not configured." };

  const { error } = await supabase.rpc("set_workspace_plan", {
    p_workspace: input.workspaceId,
    p_plan: input.planId,
    p_status: input.status ?? "active",
    p_seats: input.seats ?? 1,
    p_renews_at: input.renewsAt ?? null,
    p_provider: "manual",
    p_provider_ref: null,
  });
  if (error) return { error: error.message };

  await record(
    `Set plan to ${input.planId}`,
    "subscription",
    input.workspaceId,
    input.workspaceId,
    `${input.status ?? "active"}, ${input.seats ?? 1} seat(s)`
  );
  revalidatePath("/admin/subscriptions");
  revalidatePath("/admin/workspaces");
  return { message: "Plan updated." };
}

/* ------------------------------------------------------------------ */
/* Plans                                                               */
/* ------------------------------------------------------------------ */

export async function savePlan(input: {
  id: string;
  name: string;
  priceCents: number;
  memberLimit: number | null;
  projectLimit: number | null;
  storageLimitMb: number | null;
  features: string[];
}): Promise<ActionResult> {
  const refused = await staffOnly();
  if (refused) return { error: refused };
  if (!input.name.trim()) return { error: "A plan needs a name." };
  if (input.priceCents < 0) return { error: "A price cannot be negative." };

  // Staff, so the ordinary client is enough — `plans` has a policy for
  // exactly this, and going through the service role would skip it.
  const supabase = await createClient();
  const { error } = await supabase
    .from("plans")
    .update({
      name: input.name.trim(),
      price_cents: Math.round(input.priceCents),
      member_limit: input.memberLimit,
      project_limit: input.projectLimit,
      storage_limit_mb: input.storageLimitMb,
      features: input.features,
    })
    .eq("id", input.id);

  if (error) return { error: error.message };

  await record(`Edited the ${input.name} plan`, "plan", input.id);
  revalidatePath("/admin/plans");
  revalidatePath("/settings/billing");
  return { message: "Plan saved." };
}

/* ------------------------------------------------------------------ */
/* Support                                                             */
/* ------------------------------------------------------------------ */

export async function replyToTicket(
  ticketId: string,
  body: string,
  internal: boolean
): Promise<ActionResult> {
  const refused = await staffOnly();
  if (refused) return { error: refused };
  const text = body.trim();
  if (!text) return { error: "Write something first." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You are signed out." };

  const { error } = await supabase.from("support_messages").insert({
    ticket_id: ticketId,
    author_id: user.id,
    is_staff: true,
    internal,
    body: text,
  });
  if (error) return { error: error.message };

  // Replying moves an open ticket to "waiting" — on the customer.
  if (!internal) {
    await supabase
      .from("support_tickets")
      .update({ status: "waiting", updated_at: new Date().toISOString() })
      .eq("id", ticketId)
      .eq("status", "open");
  }

  await record(internal ? "Added an internal note" : "Replied to a ticket", "support", ticketId, ticketId);
  revalidatePath("/admin/support");
  return { message: internal ? "Note added." : "Reply sent." };
}

export async function setTicketStatus(
  ticketId: string,
  status: "open" | "waiting" | "resolved"
): Promise<ActionResult> {
  const refused = await staffOnly();
  if (refused) return { error: refused };

  const supabase = await createClient();
  const { error } = await supabase
    .from("support_tickets")
    .update({
      status,
      resolved_at: status === "resolved" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticketId);
  if (error) return { error: error.message };

  await record(`Marked a ticket ${status}`, "support", ticketId, ticketId);
  revalidatePath("/admin/support");
  return { message: "Ticket updated." };
}

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

export async function savePlatformSettings(input: {
  signupsOpen: boolean;
  supportEmail: string;
  announcement: string;
}): Promise<ActionResult> {
  const refused = await staffOnly();
  if (refused) return { error: refused };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const rows = [
    { key: "signups_open", value: input.signupsOpen },
    { key: "support_email", value: input.supportEmail.trim() },
    { key: "announcement", value: input.announcement.trim().slice(0, 500) },
  ].map((row) => ({ ...row, updated_by: user?.id ?? null, updated_at: new Date().toISOString() }));

  const { error } = await supabase.from("platform_settings").upsert(rows, { onConflict: "key" });
  if (error) return { error: error.message };

  await record("Changed platform settings", "system", null, null,
    input.signupsOpen ? "signups open" : "signups closed");
  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
  return { message: "Settings saved." };
}
