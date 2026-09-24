"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getCurrentWorkspace } from "@/lib/data/queries";
import {
  CUSTOM_FIELD_TYPES,
  type CustomFieldOption,
  type CustomFieldType,
  type CustomFieldValue,
} from "@flow/types";
import type { ActionResult } from "./workspace";

/**
 * Defining fields, and filling them in.
 *
 * The two halves have very different permissions and it matters:
 * DEFINING a column changes everybody's board and is for managers;
 * FILLING IT IN is ordinary work, for anybody who can edit the task.
 * The policies enforce that split — these functions only make sure the
 * values are shaped correctly before they reach the database.
 */

function refresh() {
  revalidatePath("/projects", "layout");
  revalidatePath("/settings/fields");
}

/** Options are only meaningful for the two types that have them. */
function cleanOptions(
  fieldType: CustomFieldType,
  options: CustomFieldOption[] | undefined
): CustomFieldOption[] | null {
  if (fieldType !== "select" && fieldType !== "multi_select") return null;
  const kept = (options ?? [])
    .map((option) => ({
      id: option.id || crypto.randomUUID(),
      label: option.label.trim().slice(0, 60),
      ...(option.color ? { color: option.color } : {}),
    }))
    .filter((option) => option.label.length > 0)
    .slice(0, 50);
  return kept.length > 0 ? kept : null;
}

export async function createField(input: {
  name: string;
  fieldType: CustomFieldType;
  options?: CustomFieldOption[];
  /** Null or absent makes it workspace-wide. */
  projectId?: string | null;
}): Promise<ActionResult & { id?: string }> {
  const name = input.name.trim();
  if (!name) return { error: "Give the field a name." };
  if (name.length > 60) return { error: "That name is too long." };
  if (!CUSTOM_FIELD_TYPES.includes(input.fieldType)) return { error: "Unknown field type." };

  const options = cleanOptions(input.fieldType, input.options);
  if ((input.fieldType === "select" || input.fieldType === "multi_select") && !options) {
    return { error: "A list field needs at least one option." };
  }

  const user = await getCurrentUser();
  if (!user) return { error: "Sign in first." };
  const ws = await getCurrentWorkspace();
  if (!ws) return { error: "No workspace selected." };

  const supabase = await createClient();

  /*
    Placed after whatever exists, rather than at zero.

    Reading the current maximum is a round trip, and getting it wrong
    only reorders columns — so it is worth one query and not worth a
    lock.
  */
  const { data: last } = await supabase
    .from("custom_fields")
    .select("position")
    .eq("workspace_id", ws.id)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("custom_fields")
    .insert({
      workspace_id: ws.id,
      project_id: input.projectId ?? null,
      name,
      field_type: input.fieldType,
      options,
      position: ((last as { position: number } | null)?.position ?? -1) + 1,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    // The unique index is what stops two "Budget" columns on one board.
    if (error.code === "23505") return { error: "A field with that name already exists here." };
    return { error: error.message };
  }

  refresh();
  return { id: data?.id, message: `${name} added.` };
}

export async function updateField(input: {
  id: string;
  name: string;
  fieldType: CustomFieldType;
  options?: CustomFieldOption[];
}): Promise<ActionResult> {
  const name = input.name.trim();
  if (!name) return { error: "A field needs a name." };

  const options = cleanOptions(input.fieldType, input.options);
  if ((input.fieldType === "select" || input.fieldType === "multi_select") && !options) {
    return { error: "A list field needs at least one option." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("custom_fields")
    .update({ name, field_type: input.fieldType, options, updated_at: new Date().toISOString() })
    .eq("id", input.id);

  if (error) {
    if (error.code === "23505") return { error: "A field with that name already exists here." };
    return { error: error.message };
  }

  refresh();
  return { message: "Field saved." };
}

/**
 * Archives a field. Nothing is deleted.
 *
 * Every value anybody entered stays in the table, so turning the field
 * back on brings the data back with it. Dropping the row would take all
 * of it, and "where did the budget column go" is not a question worth
 * being able to answer with "somebody removed it on Tuesday".
 */
export async function archiveField(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("custom_fields")
    .update({ archived: true, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: error.message };
  refresh();
  return { message: "Field removed from boards. Its values are kept." };
}

/**
 * Sets one field on one task.
 *
 * Null clears it by deleting the row, rather than storing a null —
 * "never filled in" and "deliberately emptied" look the same to a
 * person, and keeping both states would mean explaining the difference
 * to somebody who does not care.
 */
export async function setFieldValue(
  taskId: string,
  fieldId: string,
  value: CustomFieldValue
): Promise<ActionResult> {
  const supabase = await createClient();

  const empty =
    value === null ||
    value === undefined ||
    value === "" ||
    (Array.isArray(value) && value.length === 0);

  if (empty) {
    const { error } = await supabase
      .from("task_custom_field_values")
      .delete()
      .eq("task_id", taskId)
      .eq("field_id", fieldId);
    if (error) return { error: error.message };
    refresh();
    return {};
  }

  const { error } = await supabase.from("task_custom_field_values").upsert(
    {
      task_id: taskId,
      field_id: fieldId,
      // Replaced by the trigger from the task itself; a value is only
      // needed to satisfy the not-null column on the way in.
      workspace_id: taskId,
      value,
    },
    { onConflict: "task_id,field_id" }
  );

  if (error) return { error: error.message };
  refresh();
  return {};
}
