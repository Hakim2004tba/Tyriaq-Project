import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMail } from "./send";
import { layout } from "./templates";

/**
 * Mail somebody about something that just happened, now.
 *
 * The digest covers everything eventually; these are the few events
 * where "eventually" is the wrong answer — an invitation nobody knows
 * about, a join request holding somebody up, a mention that needs a
 * reply today.
 *
 * Reading the recipient's address needs the admin client: addresses live
 * in `auth.users`, which no ordinary session can read — deliberately, so
 * that being in a workspace does not hand over everybody's email.
 *
 * Never throws, and never blocks the caller's own work from succeeding.
 */
export async function mailPerson(input: {
  userId: string;
  subject: string;
  heading: string;
  intro?: string;
  action?: { label: string; href: string };
  footer?: string;
}): Promise<void> {
  try {
    const supabase = createAdminClient();
    if (!supabase) return;

    const { data } = await supabase.auth.admin.getUserById(input.userId);
    const address = data?.user?.email;
    if (!address) return;

    const { text, html } = layout({
      heading: input.heading,
      intro: input.intro,
      action: input.action,
      footer: input.footer,
    });

    await sendMail({ to: address, subject: input.subject, text, html });
  } catch (error) {
    // A missing email is not a failed action.
    console.error("[tyriaq] could not mail:", error);
  }
}
