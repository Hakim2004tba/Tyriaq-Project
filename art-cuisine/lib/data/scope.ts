import type { SessionUser } from "@/lib/auth/session";

/**
 * Commercial-ownership scoping shared by the Clients, Leads and Devis
 * modules: admins see everything, a commercial only ever sees (and can
 * only act on) the records assigned to them.
 */

/** The commercial name to restrict records to, or null when the user sees everything. */
export function getOwnerScope(user: Pick<SessionUser, "role" | "name">): string | null {
  return user.role === "commercial" ? user.name : null;
}

export function canAccessRecord(user: Pick<SessionUser, "role" | "name">, recordCommercial: string): boolean {
  const scope = getOwnerScope(user);
  return scope === null || scope === recordCommercial;
}
