import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  findUserByEmail,
  toPublicUser,
  type PublicUser,
} from "@/lib/auth/queries";
import { ensureSeeded } from "@/lib/db/seed";
import { hasAnyPermission, hasPermission, type Permission } from "@/lib/auth/permissions";
import type { Role } from "@/lib/auth/roles";
import { getClientByEmail } from "@/lib/data/clients";
import type { ClientRecord } from "@/lib/data/operations";

export const SESSION_COOKIE = "ac_session";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Self-contained, signed session cookie — no server-side session table.
 * Needed because this app runs on Vercel's serverless functions: a request
 * can land on a different instance than the one that handled login, so a
 * session row written to one instance's (ephemeral, per-instance) SQLite
 * file would be invisible to the next request. Signing the user's identity
 * directly into the cookie means any instance can verify it on its own.
 *
 * `SESSION_SECRET` must be set in production (set it in Vercel's project
 * env vars) — without it, every deployment falls back to a shared, publicly
 * knowable dev secret, which lets anyone forge a valid session cookie.
 */
const SESSION_SECRET = process.env.SESSION_SECRET ?? "dev-only-insecure-secret-change-me";

function sign(payload: string): string {
  return createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
}

function encodeSessionToken(email: string, expiresAt: number): string {
  const payload = Buffer.from(JSON.stringify({ email, exp: expiresAt }), "utf8").toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decodeSessionToken(token: string): { email: string; exp: number } | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const provided = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (provided.length !== expectedBuf.length || !timingSafeEqual(provided, expectedBuf)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { email?: unknown; exp?: unknown };
    if (typeof data.email !== "string" || typeof data.exp !== "number") return null;
    if (data.exp < Date.now()) return null;
    return { email: data.email, exp: data.exp };
  } catch {
    return null;
  }
}

export async function createSession(email: string): Promise<void> {
  const token = encodeSessionToken(email, Date.now() + SESSION_TTL_MS);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export type SessionUser = PublicUser;

/** Reads and validates the current session cookie. Does not redirect. */
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const decoded = decodeSessionToken(token);
  if (!decoded) return null;

  // Each serverless instance's SQLite file starts empty — the demo accounts
  // only exist in it once this runs, which API routes already did but no
  // page-render path did, so a cold instance serving /dashboard directly
  // would otherwise never find the user that just logged in elsewhere.
  await ensureSeeded();

  const user = findUserByEmail(decoded.email);
  if (!user || !user.active) return null;

  return toPublicUser(user);
}

/** Redirects to /login when there is no valid session. */
export async function requireSession(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect("/login");
  return user;
}

/** Redirects to /dashboard when the current user lacks the permission. */
export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await requireSession();
  if (!hasPermission(user.role as Role, permission)) {
    redirect("/dashboard");
  }
  return user;
}

/** Redirects to /dashboard unless the current user holds at least one of the permissions. */
export async function requireAnyPermission(permissions: Permission[]): Promise<SessionUser> {
  const user = await requireSession();
  if (!hasAnyPermission(user.role as Role, permissions)) {
    redirect("/dashboard");
  }
  return user;
}

/**
 * The client-portal equivalent of `requireAnyPermission` + a client-record
 * lookup, which every "mes-*" page otherwise repeats by hand. `client` is
 * null when a client-role login hasn't been matched to a ClientRecord yet —
 * callers render their own "no linked client" empty state for that case,
 * matching the existing mes-devis/mes-projets/mes-documents pages.
 */
export async function requireClientRecord(permission: Permission): Promise<{ user: SessionUser; client: ClientRecord | null }> {
  const user = await requirePermission(permission);
  const client = (await getClientByEmail(user.email)) ?? null;
  return { user, client };
}
