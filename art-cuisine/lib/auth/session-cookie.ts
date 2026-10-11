/**
 * Just the cookie name — split out of lib/auth/session.ts so the Edge
 * middleware (proxy.ts) can check for a session cookie without pulling in
 * that module's other imports, several of which now reach the Postgres
 * driver (via lib/data/clients.ts) and don't work on the Edge runtime.
 */
export const SESSION_COOKIE = "ac_session";
