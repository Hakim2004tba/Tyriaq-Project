import { headers } from "next/headers";

/**
 * The absolute origin of the current request (e.g. "https://art-cuisine.vercel.app"),
 * read from the incoming request headers rather than an env var — works
 * unchanged across localhost, Vercel preview deployments and production
 * without needing NEXT_PUBLIC_APP_URL configured anywhere. Server-only:
 * only call this from a Server Component or Server Action.
 */
export async function getSiteUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const protocol = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

/** The customer-facing tracking link for one devis, by its human-readable reference. */
export async function getTrackingUrl(devisRef: string): Promise<string> {
  const base = await getSiteUrl();
  return `${base}/suivi/${encodeURIComponent(devisRef)}`;
}
