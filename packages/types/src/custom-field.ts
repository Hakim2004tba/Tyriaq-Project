/** Matches the `custom_field_type` Postgres enum exactly. Adding a new
 * type here (e.g. "url") is the ONLY schema-adjacent change a future
 * type needs — the database itself is already generic (see
 * supabase/migrations README). */
export const CUSTOM_FIELD_TYPES = ["text", "number", "select", "multi_select", "date", "checkbox"] as const;
export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];

export interface CustomFieldOption {
  id: string;
  label: string;
  /** A semantic color token name (e.g. "info", "success") — never a
   * raw hex, same rule as every other colored badge in this app. */
  color?: string;
}

/** Mirrors the `custom_fields` table. `projectId: null` = workspace-wide
 * field; set = scoped to that one project only. */
export interface CustomField {
  id: string;
  workspaceId: string;
  projectId: string | null;
  name: string;
  fieldType: CustomFieldType;
  /** Only present for select/multi_select — enforced by a DB check
   * constraint, not just convention. */
  options: CustomFieldOption[] | null;
  position: number;
  archived: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/** The shape a value actually takes, per field type:
 * text -> string, number -> number, date -> "YYYY-MM-DD" string,
 * checkbox -> boolean, select -> option id, multi_select -> option ids. */
export type CustomFieldValue = string | number | boolean | string[] | null;

/** Mirrors the `task_custom_field_values` table. */
export interface TaskCustomFieldValue {
  id: string;
  taskId: string;
  fieldId: string;
  value: CustomFieldValue;
  updatedAt: string;
}

/** The shape Task Detail/Task List actually render: a field definition
 * paired with its current value for ONE task (or null if unset) —
 * resolved by the data layer so the UI never has to join the two
 * itself. */
export interface TaskCustomFieldEntry {
  field: CustomField;
  value: CustomFieldValue;
}
