import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/session";
import { createUser, findUserByEmail, listUsers, toPublicUser } from "@/lib/auth/queries";
import { hashPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/tokens";
import { ROLES } from "@/lib/auth/roles";

export const runtime = "nodejs";

export async function GET() {
  await requirePermission("equipe.manage");
  const users = listUsers().map(toPublicUser);
  return NextResponse.json({ users });
}

const createSchema = z.object({
  name: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères."),
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide."),
  role: z.enum(ROLES),
});

export async function POST(request: Request) {
  await requirePermission("equipe.manage");

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." },
      { status: 400 },
    );
  }

  const { name, email, role } = parsed.data;
  if (findUserByEmail(email)) {
    return NextResponse.json(
      { error: "Un compte existe déjà avec cette adresse e-mail." },
      { status: 409 },
    );
  }

  // Staff accounts are created with a random temporary password, shown once
  // to the administrator, since there is no email invite flow yet.
  const temporaryPassword = generateToken(6);
  const passwordHash = await hashPassword(temporaryPassword);
  const user = createUser({ name, email, passwordHash, role });

  return NextResponse.json(
    { user: toPublicUser(user), temporaryPassword },
    { status: 201 },
  );
}
