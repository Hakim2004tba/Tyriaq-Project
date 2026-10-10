import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureSeeded } from "@/lib/db/seed";
import { createUser, findUserByEmail, toPublicUser } from "@/lib/auth/queries";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";

export const runtime = "nodejs";

const registerSchema = z.object({
  name: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères."),
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide."),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères."),
});

export async function POST(request: Request) {
  await ensureSeeded();

  const parsed = registerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." },
      { status: 400 },
    );
  }

  const { name, email, password } = parsed.data;

  if (findUserByEmail(email)) {
    return NextResponse.json(
      { error: "Un compte existe déjà avec cette adresse e-mail." },
      { status: 409 },
    );
  }

  const passwordHash = await hashPassword(password);
  // Public self-registration always creates a client account — staff
  // accounts are provisioned by an administrator from the team workspace.
  const user = createUser({ name, email, passwordHash, role: "client" });

  await createSession(user.email);

  return NextResponse.json({ user: toPublicUser(user) }, { status: 201 });
}
