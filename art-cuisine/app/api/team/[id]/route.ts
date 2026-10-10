import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/session";
import {
  findUserById,
  setUserActive,
  toPublicUser,
  updateUserRole,
  deleteAllSessionsForUser,
} from "@/lib/auth/queries";
import { ROLES } from "@/lib/auth/roles";

export const runtime = "nodejs";

const schema = z.object({
  role: z.enum(ROLES).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requirePermission("equipe.manage");
  const { id } = await context.params;

  const target = findUserById(id);
  if (!target) {
    return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
  }

  if (target.id === session.id) {
    return NextResponse.json(
      { error: "Vous ne pouvez pas modifier votre propre compte depuis cet écran." },
      { status: 400 },
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." },
      { status: 400 },
    );
  }

  if (parsed.data.role) {
    updateUserRole(target.id, parsed.data.role);
  }
  if (parsed.data.active !== undefined) {
    setUserActive(target.id, parsed.data.active);
    if (!parsed.data.active) {
      // Deactivating an account should immediately kill any live sessions.
      deleteAllSessionsForUser(target.id);
    }
  }

  const updated = findUserById(target.id)!;
  return NextResponse.json({ user: toPublicUser(updated) });
}
