import type { PostgrestError } from "@supabase/supabase-js";

/**
 * Surfaces a failed read instead of silently returning nothing.
 *
 * A query that errors gives back `data: null`, which every caller here
 * turns into an empty array — so a broken query and an empty workspace
 * look identical on screen. That is how a schema problem in the projects
 * query showed up as "no projects" rather than as an error, with nothing
 * anywhere to say why.
 *
 * Reads still degrade to empty rather than throwing: one failing panel
 * should not take down a page. But it will not do so quietly.
 */
export function reportReadError(where: string, error: PostgrestError | null): void {
  if (!error) return;
  console.error(
    `[tyriaq] read failed in ${where}: ${error.message}` +
      (error.hint ? ` — hint: ${error.hint}` : "") +
      (error.details ? ` (${error.details})` : "")
  );
}
