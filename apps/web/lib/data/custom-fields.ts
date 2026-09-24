import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { reportReadError } from "./report";
import { getCurrentWorkspace } from "./queries";
import type {
  CustomField,
  CustomFieldOption,
  CustomFieldType,
  CustomFieldValue,
} from "@flow/types";

/**
 * Field definitions, and the values tasks carry for them.
 *
 * Read in two flat queries per project rather than joined per task: a
 * board of two hundred tasks with four fields each is eight hundred
 * values, and a join would hand back the same definition eight hundred
 * times.
 */

type FieldRow = {
  id: string;
  workspace_id: string;
  project_id: string | null;
  name: string;
  field_type: CustomFieldType;
  options: CustomFieldOption[] | null;
  position: number;
  archived: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};

function toField(row: FieldRow): CustomField {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    projectId: row.project_id,
    name: row.name,
    fieldType: row.field_type,
    options: row.options,
    position: row.position,
    archived: row.archived,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Which fields apply to one project.
 *
 * Workspace-wide fields first, then the project's own — so a column
 * everybody uses sits to the left of one invented for this board, which
 * is the order people expect to read them in.
 */
export const getProjectFields = cache(async (projectId: string): Promise<CustomField[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("custom_fields")
    .select("*")
    .eq("archived", false)
    .or(`project_id.is.null,project_id.eq.${projectId}`)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  reportReadError("getProjectFields", error);

  return ((data ?? []) as FieldRow[])
    .map(toField)
    .sort((a, b) => {
      if ((a.projectId === null) !== (b.projectId === null)) return a.projectId === null ? -1 : 1;
      return a.position - b.position;
    });
});

/** Every field defined anywhere in the workspace — the settings screen. */
export const getWorkspaceFields = cache(async (): Promise<CustomField[]> => {
  const ws = await getCurrentWorkspace();
  if (!ws) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("custom_fields")
    .select("*")
    .eq("workspace_id", ws.id)
    .eq("archived", false)
    .order("position", { ascending: true });

  reportReadError("getWorkspaceFields", error);
  return ((data ?? []) as FieldRow[]).map(toField);
});

/**
 * The values for a set of tasks, as `taskId → fieldId → value`.
 *
 * Absent means unset, which is different from a stored null — a field
 * somebody deliberately cleared and one they never touched look the
 * same to a person, but only one of them has a row.
 */
export async function getFieldValues(
  taskIds: string[]
): Promise<Record<string, Record<string, CustomFieldValue>>> {
  if (taskIds.length === 0) return {};

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_custom_field_values")
    .select("task_id, field_id, value")
    .in("task_id", taskIds);

  reportReadError("getFieldValues", error);

  const byTask: Record<string, Record<string, CustomFieldValue>> = {};
  for (const row of (data ?? []) as {
    task_id: string; field_id: string; value: CustomFieldValue;
  }[]) {
    const forTask = byTask[row.task_id] ?? (byTask[row.task_id] = {});
    forTask[row.field_id] = row.value;
  }
  return byTask;
}
