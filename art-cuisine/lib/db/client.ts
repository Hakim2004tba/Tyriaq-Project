import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_agent TEXT,
    created_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used_at TEXT
  );
`;

declare global {
  var __artCuisineDb: DatabaseSync | undefined;
}

/**
 * Vercel's deployment bundle is read-only outside /tmp, and /tmp itself is
 * wiped between cold starts (and not shared across concurrent instances) —
 * so on Vercel this is a demo-grade, non-persistent store, not a real DB.
 * Locally it's the same `.data/` folder as always, which does persist.
 */
function dataDir(): string {
  return process.env.VERCEL ? join(tmpdir(), "art-cuisine-data") : join(process.cwd(), ".data");
}

function openDatabase(): DatabaseSync {
  const dir = dataDir();
  mkdirSync(dir, { recursive: true });
  const db = new DatabaseSync(join(dir, "art-cuisine.db"));
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(SCHEMA);
  return db;
}

/**
 * A single long-lived connection, cached on `globalThis` so Next.js dev
 * fast-refresh (which re-evaluates modules) doesn't reopen the file and
 * leak handles.
 */
export function getDb(): DatabaseSync {
  if (!globalThis.__artCuisineDb) {
    globalThis.__artCuisineDb = openDatabase();
  }
  return globalThis.__artCuisineDb;
}
