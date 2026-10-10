import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureSeeded } from "@/lib/db/seed";
import { findUserByEmail, createPasswordResetToken } from "@/lib/auth/queries";
import { generateToken } from "@/lib/auth/tokens";
import { sendPasswordResetEmail } from "@/lib/auth/mailer";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide."),
});

const GENERIC_MESSAGE =
  "Si un compte existe avec cette adresse, un e-mail de réinitialisation a été envoyé.";

export async function POST(request: Request) {
  await ensureSeeded();

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." },
      { status: 400 },
    );
  }

  const user = findUserByEmail(parsed.data.email);

  // Always respond identically whether or not the account exists, so the
  // endpoint can't be used to enumerate registered email addresses.
  if (user && user.active) {
    const token = generateToken();
    createPasswordResetToken(user.id, token);
    const origin = new URL(request.url).origin;
    const resetUrl = `${origin}/reset-password?token=${token}`;
    await sendPasswordResetEmail(user.email, resetUrl);
  }

  return NextResponse.json({ message: GENERIC_MESSAGE });
}
