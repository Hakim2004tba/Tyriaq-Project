"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { toISODate, type Priority, type TaskStatus } from "@/lib/data/task-types";
import { runAutomations } from "@/lib/automations/run";
import { awardForCompletion, awardForReviewPassed, revokeForReopen } from "@/lib/scoring/award";
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
  statusId?: string | null;
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

  /*
    The column is set in a second statement rather than as an argument.

    `create_task` is shared with every other path that makes a task and
    knows nothing about board columns; teaching it would mean changing a
    function four callers depend on for the benefit of one. The trigger
    keeps `status` in step, so the pair is still consistent.
  */
  const id = (data as { id: string } | null)?.id;
  if (id && input.statusId) {
    const { error: columnError } = await supabase
      .from("tasks")
      .update({ status_id: input.statusId })
      .eq("id", id);
    if (columnError) console.error("[tyriaq] could not file the new task:", columnError.message);
  }

  if (id) {
    await runAutomations({
      taskId: id,
      projectId: input.projectId,
      trigger: "task_created",
      after: { statusId: input.statusId ?? null, category: input.status ?? "todo" },
    });
  }

  refresh();
  return { id };
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
    estimateMinutes?: number;
    /** Which board column, when the project defines its own. */
    statusId?: string | null;
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
    Written as-is; the trigger derives `status` from it, so the two
    cannot disagree. Sending both would let a caller claim a task is in
    the "Delivered" column while reporting as not started.
  */
  if (patch.statusId !== undefined) row.status_id = patch.statusId;
  if (patch.estimateMinutes !== undefined) {
    // Clamped rather than refused: somebody typing 9999 hours meant
    // something, and a form that rejects the whole save over one field
    // loses the rest of what they wrote.
    row.estimate_minutes = Math.max(0, Math.min(20160, Math.round(patch.estimateMinutes)));
  }

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

  /*
    The status BEFORE the write, read only when it might change.

    Points depend on the direction of travel — arriving at done pays,
    leaving it refunds — and after the update there is no way to tell
    which of the two just happened.
  */
  let before: { status: string } | null = null;
  if (patch.status !== undefined || patch.statusId !== undefined) {
    const { data } = await supabase.from("tasks").select("status").eq("id", id).maybeSingle();
    before = data as { status: string } | null;
  }

  let { error } = await supabase.from("tasks").update(row).eq("id", id);

  /*
    42703 is "column does not exist".

    `setStatus` sends `status_id: null` on every status change, and the
    estimate field sends `estimate_minutes` — both added by later
    migrations. On a database where those have not been run, the whole
    update failed, so moving a task to Done did nothing and said
    nothing useful about why.

    The optional columns are dropped and the write is retried once. The
    part somebody actually asked for lands; the feature that is not set
    up stays off.
  */
  if (error?.code === "42703") {
    const { estimate_minutes: _estimate, status_id: _column, ...supported } = row;
    void _estimate;
    void _column;
    if (Object.keys(supported).length > 0) {
      console.warn(
        "[tyriaq] the tasks table is missing estimate_minutes or status_id — " +
          "run supabase/apply-estimates.sql and supabase/apply-board.sql."
      );
      ({ error } = await supabase.from("tasks").update(supported).eq("id", id));
    } else {
      error = null;
    }
  }

  if (error) return { error: error.message };

  /*
    After the write, and only for the changes a rule can listen for.

    Reading the project back costs one query on every task edit, which
    is the price of rules that react to the thing that actually
    happened rather than to what the client claimed.
  */
  if (patch.status !== undefined || patch.statusId !== undefined || patch.priority !== undefined) {
    const { data: task } = await supabase
      .from("tasks")
      .select("project_id, status, status_id, priority")
      .eq("id", id)
      .maybeSingle();

    if (task) {
      const row = task as {
        project_id: string; status: string; status_id: string | null; priority: string;
      };
      await runAutomations({
        taskId: id,
        projectId: row.project_id,
        trigger: patch.priority !== undefined ? "priority_changed" : "status_changed",
        after: { statusId: row.status_id, category: row.status, priority: row.priority },
      });

      /*
        Points, after the automations and only on a status change.

        `wasDone` is read from the status BEFORE this write, so the two
        directions are told apart: arriving at done pays, leaving it
        takes the payment back. Both are idempotent in the database, so
        a status nudged twice settles the same either way.
      */
      if (patch.status !== undefined || patch.statusId !== undefined) {
        if (row.status === "done" && before?.status !== "done") {
          await awardForCompletion(id);
          if (before?.status === "review") await awardForReviewPassed(id);
        } else if (row.status !== "done" && before?.status === "done") {
          await revokeForReopen(id);
        }
      }
    }
  }

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

  if (assigned) {
    const { data: task } = await supabase
      .from("tasks")
      .select("project_id, status, status_id, priority")
      .eq("id", taskId)
      .maybeSingle();
    const row = task as
      | { project_id: string; status: string; status_id: string | null; priority: string }
      | null;
    if (row) {
      await runAutomations({
        taskId,
        projectId: row.project_id,
        trigger: "assigned",
        after: { statusId: row.status_id, category: row.status, priority: row.priority },
      });
    }
  }

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

/**
 * Stars or unstars a task for the caller.
 *
 * Nothing here says which user: the policies only ever accept
 * `auth.uid()`, so a request cannot bookmark on somebody else's behalf
 * however it is shaped.
 */
export async function setTaskStarred(taskId: string, starred: boolean): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in first." };

  const supabase = await createClient();
  const { error } = starred
    ? await supabase
        .from("task_stars")
        // Overwritten by the trigger from the task itself.
        .insert({ task_id: taskId, user_id: user.id, workspace_id: taskId })
    : await supabase.from("task_stars").delete().eq("task_id", taskId).eq("user_id", user.id);

  // Starring twice is not an error worth surfacing; it is already true.
  if (error && error.code !== "23505") return { error: error.message };
  refresh();
  return {};
}
