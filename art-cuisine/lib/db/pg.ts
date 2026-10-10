import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@/lib/db/schema";

/**
 * The real, persistent data store — one shared Postgres database every
 * serverless instance reads and writes, replacing the in-memory arrays in
 * lib/data/operations.ts that don't survive across instances on Vercel.
 * DATABASE_URL is a Prisma Postgres connection string (plain Postgres wire
 * protocol on db.prisma.io:5432), not Neon — hence the standard `pg` driver
 * rather than an HTTP-specific one.
 */
function connectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Provision a Postgres database (Vercel Storage → Create Database) and connect it to this project, or set DATABASE_URL locally in .env.local for development.",
    );
  }
  return url;
}

declare global {
  // eslint-disable-next-line no-var
  var __artCuisinePgPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __artCuisinePgDb: ReturnType<typeof drizzle<typeof schema>> | undefined;
}

export function getPgDb() {
  if (!globalThis.__artCuisinePgDb) {
    globalThis.__artCuisinePgPool = new Pool({ connectionString: connectionString(), max: 5 });
    globalThis.__artCuisinePgDb = drizzle(globalThis.__artCuisinePgPool, { schema });
  }
  return globalThis.__artCuisinePgDb;
}
