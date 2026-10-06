/**
 * Telling "not set up" apart from "nothing here".
 *
 * Every feature in Tyriaq has two halves: the code, which ships with a
 * deploy, and its tables and functions, which arrive when somebody runs
 * a file in the SQL editor. Between those two moments the code is live
 * and the database half is not.
 *
 * That gap has now produced the same failure three times — a board
 * reading "No tasks yet" when it could not read at all, and a button
 * that answered "Could not find the function public.enable_scoring in
 * the schema cache". Both are the product asking for something that is
 * not there yet and reporting it as though the user had done something
 * wrong.
 *
 * So readers ask this instead of treating every error as emptiness.
 */

/** Postgres and PostgREST codes for "that does not exist here". */
const MISSING_CODES = new Set([
  "42P01", // undefined_table
  "42883", // undefined_function
  "42703", // undefined_column
  "PGRST202", // PostgREST: no function by that name in the schema cache
  "PGRST205", // PostgREST: no table by that name
]);

export function isNotInstalled(error: { code?: string } | null | undefined): boolean {
  return Boolean(error?.code && MISSING_CODES.has(error.code));
}

/** Which file turns a feature on, so the screen can name it. */
export const SETUP_FILE = {
  scoring: "supabase/apply-scoring.sql",
  automations: "supabase/apply-automations.sql",
  board: "supabase/apply-board.sql",
  customFields: "supabase/apply-custom-fields.sql",
  estimates: "supabase/apply-estimates.sql",
} as const;

export type FeatureName = keyof typeof SETUP_FILE;
