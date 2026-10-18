/**
 * Thin wrapper around Resend's API — the one place this app sends real
 * email from. No sending domain is verified yet, so every send goes out
 * from Resend's shared "onboarding@resend.dev" address, which Resend only
 * actually delivers to the account owner's own verified address; sending
 * to a real client's inbox needs a verified domain added in Resend first.
 * Resend itself enforces that restriction and returns a clear error when
 * it's hit — this wrapper just surfaces that error rather than hiding it,
 * so a failed send is never reported as a success.
 */

export class EmailError extends Error {}

const FROM = "ART Cuisine <onboarding@resend.dev>";

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new EmailError(
      "RESEND_API_KEY n'est pas configurée. Ajoutez-la dans .env.local pour le développement, et dans les variables d'environnement Vercel pour la production.",
    );
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message = (body as { message?: string }).message ?? `erreur ${response.status}`;
    throw new EmailError(`L'envoi a échoué : ${message}`);
  }
}
