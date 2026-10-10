/**
 * Stand-in for a transactional email provider. No SMTP/API key is
 * configured for this project, so messages are written to the server
 * console instead of being delivered — swap this out for a real provider
 * (Resend, Postmark, SES…) before going to production.
 */
export async function sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
  console.log(
    `[mailer] Password reset requested for ${email}\n[mailer] Reset link (valid 1h): ${resetUrl}`,
  );
}
