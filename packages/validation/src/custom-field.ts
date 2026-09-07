import { z } from "zod";
import { CUSTOM_FIELD_TYPES } from "@flow/types";

export const customFieldNameSchema = z.string().trim().min(1, "Name is required").max(60, "Name is too long");

export const customFieldOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().trim().min(1).max(40),
  color: z.string().optional(),
});

export const createCustomFieldSchema = z
  .object({
    name: customFieldNameSchema,
    fieldType: z.enum(CUSTOM_FIELD_TYPES),
    projectId: z.string().uuid().nullable().optional(),
    options: z.array(customFieldOptionSchema).optional(),
  })
  .refine((data) => (["select", "multi_select"].includes(data.fieldType) ? (data.options?.length ?? 0) > 0 : true), {
    message: "Select fields need at least one option",
    path: ["options"],
  });
export type CreateCustomFieldInput = z.infer<typeof createCustomFieldSchema>;

/** Validates a value against ITS field's type — the one place per-type
 * value shape is checked, kept separate from the field-definition
 * schema above so adding a new field type only ever means adding one
 * case here, never touching the database. */
export function validateCustomFieldValue(fieldType: string, value: unknown): { valid: boolean; error?: string } {
  if (value === null || value === undefined) return { valid: true };

  switch (fieldType) {
    case "text":
      return typeof value === "string" && value.length <= 2000 ? { valid: true } : { valid: false, error: "Must be text under 2000 characters." };
    case "number":
      return typeof value === "number" && Number.isFinite(value) ? { valid: true } : { valid: false, error: "Must be a number." };
    case "date":
      return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? { valid: true } : { valid: false, error: "Must be a valid date." };
    case "checkbox":
      return typeof value === "boolean" ? { valid: true } : { valid: false, error: "Must be true or false." };
    case "select":
      return typeof value === "string" ? { valid: true } : { valid: false, error: "Must be a single option." };
    case "multi_select":
      return Array.isArray(value) && value.every((v) => typeof v === "string") ? { valid: true } : { valid: false, error: "Must be a list of options." };
    default:
      return { valid: false, error: "Unknown field type." };
  }
}
