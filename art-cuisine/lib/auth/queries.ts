import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db/client";
import { hashToken } from "@/lib/auth/tokens";
import type { Role } from "@/lib/auth/roles";

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: Role;
  active: number;
  created_at: string;
}

export type PublicUser = Omit<UserRecord, "password_hash">;

export function toPublicUser(user: UserRecord): PublicUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password_hash: _password_hash, ...rest } = user;
  return rest;
}

export function findUserByEmail(email: string): UserRecord | undefined {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM users WHERE email = ? COLLATE NOCASE")
    .get(email) as UserRecord | undefined;
  return row;
}

export function findUserById(id: string): UserRecord | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id) as
    | UserRecord
    | undefined;
}

export function listUsers(): UserRecord[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM users ORDER BY created_at DESC")
    .all() as unknown as UserRecord[];
}

export function countUsers(): number {
  const db = getDb();
  const row = db.prepare("SELECT COUNT(*) as count FROM users").get() as {
    count: number;
  };
  return row.count;
}

export function createUser(input: {
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  active?: boolean;
}): UserRecord {
  const db = getDb();
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  db.prepare(
    `INSERT INTO users (id, name, email, password_hash, role, active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.name,
    input.email.toLowerCase(),
    input.passwordHash,
    input.role,
    input.active === false ? 0 : 1,
    createdAt,
  );
  return findUserById(id)!;
}

export function updateUserProfile(
  id: string,
  input: { name: string; email: string },
): void {
  const db = getDb();
  db.prepare("UPDATE users SET name = ?, email = ? WHERE id = ?").run(
    input.name,
    input.email.toLowerCase(),
    id,
  );
}

export function updateUserPassword(id: string, passwordHash: string): void {
  const db = getDb();
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(
    passwordHash,
    id,
  );
}

export function updateUserRole(id: string, role: Role): void {
  const db = getDb();
  db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, id);
}

export function setUserActive(id: string, active: boolean): void {
  const db = getDb();
  db.prepare("UPDATE users SET active = ? WHERE id = ?").run(
    active ? 1 : 0,
    id,
  );
}

// --- Sessions -------------------------------------------------------------

export interface SessionRecord {
  token_hash: string;
  user_id: string;
  user_agent: string | null;
  created_at: string;
  last_seen_at: string;
  expires_at: string;
}

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function createSessionRecord(input: {
  token: string;
  userId: string;
  userAgent: string | null;
}): SessionRecord {
  const db = getDb();
  const tokenHash = hashToken(input.token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  db.prepare(
    `INSERT INTO sessions (token_hash, user_id, user_agent, created_at, last_seen_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    tokenHash,
    input.userId,
    input.userAgent,
    now.toISOString(),
    now.toISOString(),
    expiresAt.toISOString(),
  );
  return db
    .prepare("SELECT * FROM sessions WHERE token_hash = ?")
    .get(tokenHash) as unknown as SessionRecord;
}

export function findSessionByToken(token: string): SessionRecord | undefined {
  const db = getDb();
  return db
    .prepare("SELECT * FROM sessions WHERE token_hash = ?")
    .get(hashToken(token)) as SessionRecord | undefined;
}

export function touchSession(tokenHash: string): void {
  const db = getDb();
  db.prepare("UPDATE sessions SET last_seen_at = ? WHERE token_hash = ?").run(
    new Date().toISOString(),
    tokenHash,
  );
}

export function deleteSessionByToken(token: string): void {
  const db = getDb();
  db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(
    hashToken(token),
  );
}

export function deleteSessionByHash(tokenHash: string): void {
  const db = getDb();
  db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash);
}

export function listSessionsForUser(userId: string): SessionRecord[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT * FROM sessions WHERE user_id = ? ORDER BY last_seen_at DESC",
    )
    .all(userId) as unknown as SessionRecord[];
}

export function deleteOtherSessions(userId: string, keepTokenHash: string): void {
  const db = getDb();
  db.prepare(
    "DELETE FROM sessions WHERE user_id = ? AND token_hash != ?",
  ).run(userId, keepTokenHash);
}

export function deleteAllSessionsForUser(userId: string): void {
  const db = getDb();
  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
}

// --- Password reset tokens --------------------------------------------------

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export function createPasswordResetToken(userId: string, token: string): void {
  const db = getDb();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + RESET_TOKEN_TTL_MS);
  db.prepare(
    `INSERT INTO password_reset_tokens (token_hash, user_id, created_at, expires_at, used_at)
     VALUES (?, ?, ?, ?, NULL)`,
  ).run(hashToken(token), userId, now.toISOString(), expiresAt.toISOString());
}

export interface PasswordResetTokenRecord {
  token_hash: string;
  user_id: string;
  created_at: string;
  expires_at: string;
  used_at: string | null;
}

export function findPasswordResetToken(
  token: string,
): PasswordResetTokenRecord | undefined {
  const db = getDb();
  return db
    .prepare("SELECT * FROM password_reset_tokens WHERE token_hash = ?")
    .get(hashToken(token)) as PasswordResetTokenRecord | undefined;
}

export function markPasswordResetTokenUsed(tokenHash: string): void {
  const db = getDb();
  db.prepare(
    "UPDATE password_reset_tokens SET used_at = ? WHERE token_hash = ?",
  ).run(new Date().toISOString(), tokenHash);
}

export function invalidateResetTokensForUser(userId: string): void {
  const db = getDb();
  db.prepare(
    "DELETE FROM password_reset_tokens WHERE user_id = ?",
  ).run(userId);
}
