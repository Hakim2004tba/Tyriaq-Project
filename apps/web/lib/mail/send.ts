import "server-only";

/**
 * Sending email.
 *
 * Over HTTP rather than SMTP, because this runs on serverless functions
 * where a socket held open for the length of an SMTP conversation is the
 * wrong shape — and because it keeps the dependency list at zero.
 *
 * Nothing here throws. A notification that could not be emailed must not
 * take down the action that caused it: somebody's comment is worth more
 * than the message about it. Failures are logged and reported in the
 * return value for callers that want to say "sent" or "ready to send".
 *
 * With no key configured, mail is written to the log instead. That is
 * deliberate rather than a stub — it means every path that sends email
 * works in development, and a deployment without a mail provider still
 * functions, just quietly.
 */

export interface Mail {
  to: string;
  subject: string;
  /** Plain text. Always sent — some people read mail that way. */
  text: string;
  /** Optional HTML. When absent, the text is sent on its own. */
  html?: string;
}

export interface MailResult {
  sent: boolean;
  error?: string;
}

const KEY = process.env.RESEND_API_KEY?.trim();

/**
 * Who it comes from.
 *
 * Resend's shared sender works without a verified domain but can only
 * reach the account owner's own address — which is exactly what testing
 * needs before a domain exists, and useless in production. Once
 * tyriaq.com (or whatever it becomes) is verified, set MAIL_FROM.
 */
const FROM = process.env.MAIL_FROM?.trim() || "Tyriaq <onboarding@resend.dev>";

export const isMailConfigured = Boolean(KEY);

export async function sendMail(mail: Mail): Promise<MailResult> {
  if (!isMailConfigured) {
    console.info(
      `[tyriaq] mail not configured — not sent.\n` +
        `  to      : ${mail.to}\n` +
        `  subject : ${mail.subject}\n` +
        mail.text
          .split("\n")
          .map((line) => `  | ${line}`)
          .join("\n")
    );
    return { sent: false, error: "Mail is not configured." };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [mail.to],
        subject: mail.subject,
        text: mail.text,
        ...(mail.html ? { html: mail.html } : {}),
      }),
      // A hung mail provider must not hold a Server Action open until the
      // platform kills it.
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error(`[tyriaq] mail refused (${response.status}): ${detail.slice(0, 300)}`);
      return { sent: false, error: "The mail provider refused that message." };
    }
    return { sent: true };
  } catch (error) {
    console.error("[tyriaq] mail failed:", error);
    return { sent: false, error: "Could not reach the mail provider." };
  }
}

/** Several messages, without letting one failure stop the rest. */
export async function sendAll(mails: Mail[]): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  for (const mail of mails) {
    const result = await sendMail(mail);
    if (result.sent) sent += 1;
    else failed += 1;
  }
  return { sent, failed };
}
