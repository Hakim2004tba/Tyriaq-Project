"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getCurrentWorkspace } from "@/lib/data/queries";
import { sendMail } from "@/lib/mail/send";
import { layout } from "@/lib/mail/templates";
import type { ActionResult } from "./workspace";

/**
 * Plan changes.
 *
 * `requestPlan` records that a workspace wants a plan and tells whoever
 * runs Tyriaq. It does NOT move them onto it — Tyriaq cannot take a
 * payment yet, and a button that granted Pro because somebody pressed it
 * would be giving the product away while looking like billing.
 *
 * When a provider is chosen, the confirmation it sends is what calls
 * `set_workspace_plan`, and this stays exactly as it is for the plans
 * that are sold by conversation rather than by card.
 */

/** Where an upgrade request lands. Empty means nobody is told. */
const SALES_INBOX = process.env.BILLING_NOTIFY_EMAIL?.trim();

export async function requestPlan(planId: string, note: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in first." };
  const ws = await getCurrentWorkspace();
  if (!ws) return { error: "No workspace selected." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("request_plan", {
    p_workspace: ws.id,
    p_plan: planId,
    p_note: note.trim().slice(0, 500),
  });
  if (error) return { error: error.message };

  /*
    Mailed to whoever runs Tyriaq, not to the customer.

    The customer already knows what they asked for — they are looking at
    the screen that says so. The person who has to act on it is the one
    who needs a message.
  */
  if (SALES_INBOX) {
    const { text, html } = layout({
      heading: `${ws.name} wants the ${planId} plan`,
      intro: note.trim() || undefined,
      lines: [
        { title: "Workspace", body: `${ws.name} (${ws.id})` },
        { title: "Asked by", body: user.email ?? user.id },
      ],
      footer: "Sent by Tyriaq because somebody pressed Upgrade.",
    });
    await sendMail({ to: SALES_INBOX, subject: `Upgrade request: ${ws.name} → ${planId}`, text, html });
  }

  revalidatePath("/settings/billing");
  revalidatePath("/", "layout");
  return {
    message: SALES_INBOX
      ? "Request sent. Somebody will get in touch about payment."
      : "Request recorded. Nobody is notified yet — set BILLING_NOTIFY_EMAIL.",
  };
}

/**
 * Whether one more of something fits inside the plan.
 *
 * Returns the reason rather than a boolean so callers can say why. Used
 * before adding a member or creating a project — the two things the
 * plans actually limit.
 */
export async function checkPlanAllows(
  what: "member" | "project"
): Promise<{ allowed: boolean; reason?: string }> {
  const ws = await getCurrentWorkspace();
  if (!ws) return { allowed: false, reason: "No workspace selected." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("plan_allows", { p_workspace: ws.id, p_what: what })
    .maybeSingle();

  /*
    A failure here must not stop somebody working.

    If the limit cannot be read — the migration has not been applied, the
    function is missing — the right answer is to allow it. Refusing work
    because billing is broken is the worse of the two mistakes.
  */
  if (error || !data) {
    if (error) console.error("[tyriaq] could not check the plan:", error);
    return { allowed: true };
  }

  const row = data as { allowed: boolean; reason: string | null };
  return { allowed: row.allowed, reason: row.reason ?? undefined };
}
