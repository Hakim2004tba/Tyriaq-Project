import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireSession, SESSION_COOKIE } from "@/lib/auth/session";
import { deleteOtherSessions } from "@/lib/auth/queries";
import { hashToken } from "@/lib/auth/tokens";

export const runtime = "nodejs";

export async function POST() {
  const session = await requireSession();
  const cookieStore = await cookies();
  const currentToken = cookieStore.get(SESSION_COOKIE)?.value;

  if (!currentToken) {
    return NextResponse.json({ error: "Session introuvable." }, { status: 400 });
  }

  deleteOtherSessions(session.id, hashToken(currentToken));
  return NextResponse.json({ ok: true });
}
