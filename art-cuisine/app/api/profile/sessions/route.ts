import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireSession, SESSION_COOKIE } from "@/lib/auth/session";
import { deleteSessionByHash, listSessionsForUser } from "@/lib/auth/queries";
import { hashToken } from "@/lib/auth/tokens";

export const runtime = "nodejs";

export async function GET() {
  const session = await requireSession();
  const cookieStore = await cookies();
  const currentToken = cookieStore.get(SESSION_COOKIE)?.value;
  const currentHash = currentToken ? hashToken(currentToken) : null;

  const sessions = listSessionsForUser(session.id).map((s) => ({
    tokenHash: s.token_hash,
    userAgent: s.user_agent,
    createdAt: s.created_at,
    lastSeenAt: s.last_seen_at,
    isCurrent: s.token_hash === currentHash,
  }));

  return NextResponse.json({ sessions });
}

export async function DELETE(request: Request) {
  const session = await requireSession();
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("tokenHash");

  if (!tokenHash) {
    return NextResponse.json({ error: "Session introuvable." }, { status: 400 });
  }

  const owned = listSessionsForUser(session.id).some((s) => s.token_hash === tokenHash);
  if (!owned) {
    return NextResponse.json({ error: "Session introuvable." }, { status: 404 });
  }

  deleteSessionByHash(tokenHash);

  const cookieStore = await cookies();
  const currentToken = cookieStore.get(SESSION_COOKIE)?.value;
  if (currentToken && hashToken(currentToken) === tokenHash) {
    cookieStore.delete(SESSION_COOKIE);
  }

  return NextResponse.json({ ok: true });
}
