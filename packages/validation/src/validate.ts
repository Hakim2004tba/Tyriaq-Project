import type { z } from "zod";

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; fieldErrors: Partial<Record<keyof T, string>>; formError?: string };

/**
 * Runs a zod schema and flattens the result into field-level error
 * messages. Apps consume this instead of importing zod directly, so
 * the validation library stays an implementation detail of
 * @flow/validation.
 */
export function validate<T>(schema: z.ZodType<T>, input: unknown): ValidationResult<T> {
  const result = schema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const fieldErrors: Record<string, string> = {};
  let formError: string | undefined;

  for (const issue of result.error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in fieldErrors)) {
      fieldErrors[key] = issue.message;
    } else if (issue.path.length === 0 && !formError) {
      formError = issue.message;
    }
  }

  return { success: false, fieldErrors: fieldErrors as Partial<Record<keyof T, string>>, formError };
}
