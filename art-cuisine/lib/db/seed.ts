import { countUsers, createUser } from "@/lib/auth/queries";
import { hashPassword } from "@/lib/auth/password";
import type { Role } from "@/lib/auth/roles";

export const DEMO_PASSWORD = "ArtCuisine2026!";

const DEMO_ACCOUNTS: { name: string; email: string; role: Role }[] = [
  { name: "Admin ART Cuisine", email: "admin@art-cuisine.dz", role: "admin" },
  { name: "Sofia Lahlou", email: "commercial@art-cuisine.dz", role: "commercial" },
  { name: "Yacine Khelifi", email: "designer@art-cuisine.dz", role: "designer" },
  { name: "Karim Meziane", email: "production@art-cuisine.dz", role: "production" },
  { name: "Nadia Slimani", email: "vernisseur@art-cuisine.dz", role: "vernisseur" },
  { name: "Rachid Ait Said", email: "montage@art-cuisine.dz", role: "montage" },
  { name: "Fatima Zahra", email: "client@art-cuisine.dz", role: "client" },
];

let seeded = false;
let seedingPromise: Promise<void> | null = null;

/**
 * Populates the local database with one demo account per role on first run,
 * so the permission system can be exercised immediately without a manual
 * setup step. All demo accounts share `DEMO_PASSWORD`.
 *
 * Called on every session check (see lib/auth/session.ts), not just
 * login/register — on Vercel, each serverless instance's SQLite file starts
 * empty, so this can now run concurrently for the same cold instance across
 * near-simultaneous requests. `seedingPromise` serializes those: the
 * synchronous check-and-set below (before any `await`) runs atomically, so
 * only the first caller actually seeds — everyone else awaits that same
 * in-flight call instead of racing it with their own insert.
 */
export async function ensureSeeded(): Promise<void> {
  if (seeded) return;
  if (seedingPromise) {
    await seedingPromise;
    return;
  }

  seedingPromise = (async () => {
    if (countUsers() > 0) {
      seeded = true;
      return;
    }

    const passwordHash = await hashPassword(DEMO_PASSWORD);
    for (const account of DEMO_ACCOUNTS) {
      createUser({
        name: account.name,
        email: account.email,
        passwordHash,
        role: account.role,
      });
    }
    seeded = true;
  })();

  try {
    await seedingPromise;
  } finally {
    seedingPromise = null;
  }
}
