import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureSeeded } from "@/lib/db/seed";
import { findUserByEmail, toPublicUser } from "@/lib/auth/queries";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";

export const runtime = "nodejs";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide."),
  password: z.string().min(1, "Mot de passe requis."),
});

const INVALID_CREDENTIALS = "Adresse e-mail ou mot de passe incorrect.";

export async function POST(request: Request) {
  await ensureSeeded();

  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." },
      { status: 400 },
    );
  }

  const { email, password } = parsed.data;
  const user = findUserByEmail(email);
  if (!user) {
    return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 401 });
  }

  if (!user.active) {
    return NextResponse.json(
      { error: "Ce compte a été désactivé. Contactez votre administrateur." },
      { status: 403 },
    );
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 401 });
  }

  await createSession(user.email);

  return NextResponse.json({ user: toPublicUser(user) });
}
