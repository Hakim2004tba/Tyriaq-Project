import { NextResponse } from "next/server";
import { z } from "zod";
import {
  findPasswordResetToken,
  markPasswordResetTokenUsed,
  invalidateResetTokensForUser,
  updateUserPassword,
  deleteAllSessionsForUser,
} from "@/lib/auth/queries";
import { hashPassword } from "@/lib/auth/password";

export const runtime = "nodejs";

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères."),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." },
      { status: 400 },
    );
  }

  const { token, password } = parsed.data;
  const record = findPasswordResetToken(token);

  if (!record || record.used_at || new Date(record.expires_at).getTime() < Date.now()) {
    return NextResponse.json(
      { error: "Ce lien de réinitialisation est invalide ou a expiré." },
      { status: 400 },
    );
  }

  const passwordHash = await hashPassword(password);
  updateUserPassword(record.user_id, passwordHash);
  markPasswordResetTokenUsed(record.token_hash);
  invalidateResetTokensForUser(record.user_id);
  // A password reset is a strong signal of compromise recovery — sign the
  // account out everywhere and require a fresh login with the new password.
  deleteAllSessionsForUser(record.user_id);

  return NextResponse.json({ ok: true });
}
