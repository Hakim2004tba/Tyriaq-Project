import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, SESSION_COOKIE } from "@/lib/auth/session";
import { findUserById, updateUserPassword, deleteOtherSessions } from "@/lib/auth/queries";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { hashToken } from "@/lib/auth/tokens";
import { cookies } from "next/headers";

export const runtime = "nodejs";

const schema = z.object({
  currentPassword: z.string().min(1, "Mot de passe actuel requis."),
  newPassword: z.string().min(8, "Le nouveau mot de passe doit contenir au moins 8 caractères."),
});

export async function PATCH(request: Request) {
  const session = await requireSession();

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." },
      { status: 400 },
    );
  }

  const user = findUserById(session.id)!;
  const valid = await verifyPassword(parsed.data.currentPassword, user.password_hash);
  if (!valid) {
    return NextResponse.json(
      { error: "Le mot de passe actuel est incorrect." },
      { status: 400 },
    );
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  updateUserPassword(user.id, passwordHash);

  const cookieStore = await cookies();
  const currentToken = cookieStore.get(SESSION_COOKIE)?.value;
  if (currentToken) {
    deleteOtherSessions(user.id, hashToken(currentToken));
  }

  return NextResponse.json({ ok: true });
}
