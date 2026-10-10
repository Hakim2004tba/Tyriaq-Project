import { createHash, randomBytes } from "node:crypto";

/** A random, URL-safe opaque token — used for session ids and reset links. */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** One-way hash of a token, so raw reset tokens are never stored at rest. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
