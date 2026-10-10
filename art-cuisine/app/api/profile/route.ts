import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { findUserByEmail, updateUserProfile, toPublicUser, findUserById } from "@/lib/auth/queries";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères."),
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide."),
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

  const { name, email } = parsed.data;
  const existing = findUserByEmail(email);
  if (existing && existing.id !== session.id) {
    return NextResponse.json(
      { error: "Cette adresse e-mail est déjà utilisée." },
      { status: 409 },
    );
  }

  updateUserProfile(session.id, { name, email });
  const updated = findUserById(session.id)!;

  return NextResponse.json({ user: toPublicUser(updated) });
}
