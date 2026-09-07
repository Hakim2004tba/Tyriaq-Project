"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { toISODate, type Priority, type TaskStatus } from "@/lib/data/task-types";
import type { ActionResult } from "./workspace";

/**
 * Task writes.
 *
 * These are called from the optimistic store, which has already moved
 * the interface before the request leaves the browser. So each one
 * returns a plain `ActionResult`: the client only needs to know whether
 * to keep its optimistic state or roll it back and say why.
 *
 * Nothing here checks permissions. RLS does — a write to a workspace the
 * caller is not in affects zero rows, and the error surfaces the same
 * way any other failure does. Re-implementing the check here would mean
 * two policies to keep in step, and the weaker one would win.
 *
 * `revalidatePath` refreshes the server-rendered copy so a reload shows
 * what the optimistic UI already shows; it is not what makes the change
 * visible.
 */

const STATUSES: TaskStatus[] = ["todo", "in_progress", "review", "done", "blocked"];
const PRIORITIES: Priority[] = ["urgent", "high", "medium", "low"];

function refresh() {
  revalidatePath("/projects", "layout");
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
}

export async function createTask(input: {
  projectId: string;
  title: string;
  status?: TaskStatus;
  priority?: Priority;
  parentId?: string | null;
  startOffset?: number | null;
  dueOffset?: number | null;
}): Promise<ActionResult & { id?: string }> {
  const title = input.title.trim();
  if (!title) return { error: "Give the task a title." };
  if (title.length > 200) return { error: "Task titles are limited to 200 characters." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_task", {
    p_project: input.projectId,
    p_title: title,
    p_status: STATUSES.includes(input.status!) ? input.status : "todo",
    p_priority: PRIORITIES.includes(input.priority!) ? input.priority : "medium",
    p_parent: input.parentId ?? null,
    p_start_date: toISODate(input.startOffset ?? null),
    p_due_date: toISODate(input.dueOffset ?? null),
  });

  if (error) return { error: error.message };
  refresh();
  return { id: (data as { id: string } | null)?.id };
}

export async function updateTask(
  id: string,
  patch: {
    title?: string;
    description?: string;
    status?: TaskStatus;
    priority?: Priority;
    startOffset?: number | null;
    dueOffset?: number | null;
    tags?: string[];
    milestone?: boolean;
  }
): Promise<ActionResult> {
  const row: Record<string, unknown> = {};

  if (patch.title !== undefined) {
    const title = patch.title.trim();
    if (!title) return { error: "A task needs a title." };
    row.title = title.slice(0, 200);
  }
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.status !== undefined && STATUSES.includes(patch.status)) row.status = patch.status;
  if (patch.priority !== undefined && PRIORITIES.includes(patch.priority)) row.priority = patch.priority;
  if (patch.tags !== undefined) row.tags = patch.tags.map((t) => t.trim()).filter(Boolean).slice(0, 20);
  if (patch.milestone !== undefined) row.is_milestone = patch.milestone;

  /*
    Dates are sent as a pair whenever either moves.

    The table refuses a start after its due date, and a Gantt drag moves
    both together — sending them one at a time would trip that check
    halfway through a legitimate move.
  */
  if (patch.startOffset !== undefined) row.start_date = toISODate(patch.startOffset);
  if (patch.dueOffset !== undefined) row.due_date = toISODate(patch.dueOffset);

  if (Object.keys(row).length === 0) return {};

  const supabase = await createClient();
  const { error } = await supabase.from("tasks").update(row).eq("id", id);
  if (error) return { error: error.message };
  refresh();
  return {};
}

export async function deleteTask(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) return { error: error.message };
  refresh();
  return { message: "Task deleted." };
}

/**
 * A drop: the task lands between two neighbours, possibly in another
 * column. The neighbours are named rather than a computed position,
 * because only the database knows where they currently sit.
 */
export async function moveTask(
  id: string,
  status: TaskStatus | null,
  previousId: string | null,
  nextId: string | null
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("move_task", {
    p_task: id,
    p_status: status && STATUSES.includes(status) ? status : null,
    p_previous: previousId,
    p_next: nextId,
  });
  if (error) return { error: error.message };
  refresh();
  return {};
}

export async function setTaskAssignee(
  taskId: string,
  userId: string,
  assigned: boolean
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = assigned
    ? await supabase
        .from("task_assignees")
        // The workspace is stamped by a trigger; the placeholder only
        // satisfies the not-null column on the way in.
        .insert({ task_id: taskId, user_id: userId, workspace_id: taskId })
        .select()
    : await supabase.from("task_assignees").delete().eq("task_id", taskId).eq("user_id", userId);

  if (error) return { error: error.message };
  refresh();
  return {};
}

export async function setTaskDependency(
  predecessorId: string,
  successorId: string,
  linked: boolean
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = linked
    ? await supabase
        .from("task_dependencies")
        .insert({ predecessor_id: predecessorId, successor_id: successorId, workspace_id: predecessorId })
        .select()
    : await supabase
        .from("task_dependencies")
        .delete()
        .eq("predecessor_id", predecessorId)
        .eq("successor_id", successorId);

  if (error) return { error: error.message };
  refresh();
  return {};
}
