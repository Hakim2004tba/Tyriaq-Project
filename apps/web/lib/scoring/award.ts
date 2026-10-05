import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Paying for work, when it actually lands.
 *
 * Called from the task actions after a write succeeds. Everything that
 * decides HOW MUCH lives in the database — the rules, the weighting, the
 * daily ceiling, the deduplication — because those are the parts a
 * project edits and the parts that must not be computable by a client.
 * What lives here is only "what just happened, and to whom".
 *
 * Nothing throws. Points are a layer over the work; a broken scoring
 * rule must not stop somebody closing a task, and it must certainly not
 * roll one back.
 */

interface TaskSnapshot {
  id: string;
  project_id: string;
  status: string;
  priority: string;
  due_date: string | null;
  estimate_minutes: number | null;
}

/**
 * The key that makes an award happen once.
 *
 * Built from the task and the reason rather than from a timestamp, so
 * nudging a status back and forth cannot be used to collect twice — and
 * so the reversal can find exactly the row it is undoing.
 */
function key(taskId: string, event: string): string {
  return `${event}:${taskId}`;
}

/**
 * Somebody finished something.
 *
 * Three separate awards, because they answer three different questions:
 * did you do the work, did you do it by when you said, and did you beat
 * that. A single lumped number could not be explained back to the person
 * who earned it.
 */
export async function awardForCompletion(taskId: string): Promise<void> {
  try {
    const supabase = await createClient();

    const { data } = await supabase
      .from("tasks")
      .select("id, project_id, status, priority, due_date, estimate_minutes")
      .eq("id", taskId)
      .maybeSingle();
    const task = data as TaskSnapshot | null;
    if (!task || task.status !== "done") return;

    /*
      Paid to the ASSIGNEES, not to whoever moved the card.

      Otherwise the points go to whoever happens to tidy the board on a
      Friday — and a manager dragging twenty finished tasks into Done
      would out-earn the people who did them.
    */
    const { data: assignees } = await supabase
      .from("task_assignees")
      .select("user_id")
      .eq("task_id", taskId);

    const people = ((assignees ?? []) as { user_id: string }[]).map((row) => row.user_id);
    if (people.length === 0) return;

    const hours = task.estimate_minutes ? task.estimate_minutes / 60 : null;
    const today = new Date().toISOString().slice(0, 10);

    for (const userId of people) {
      await supabase.rpc("award_points", {
        p_project: task.project_id,
        p_user: userId,
        p_event: "task_completed",
        p_task: taskId,
        p_actor: null,
        p_reason: null,
        p_dedupe: key(taskId, "task_completed"),
        p_hours: hours,
        p_priority: task.priority,
      });

      if (task.due_date) {
        /*
          On time is "not after the due date", and early is "before it".
          Both are decided from the DATE rather than the timestamp,
          because a due date is a day — finishing at 23:00 on the day it
          was due is on time, and any other reading would be a trap.
        */
        if (today <= task.due_date) {
          await supabase.rpc("award_points", {
            p_project: task.project_id,
            p_user: userId,
            p_event: "completed_on_time",
            p_task: taskId,
            p_dedupe: key(taskId, "completed_on_time"),
            p_priority: task.priority,
          });
        }
        if (today < task.due_date) {
          await supabase.rpc("award_points", {
            p_project: task.project_id,
            p_user: userId,
            p_event: "completed_early",
            p_task: taskId,
            p_dedupe: key(taskId, "completed_early"),
            p_priority: task.priority,
          });
        }
      }
    }
  } catch (error) {
    console.error("[tyriaq] could not award points:", error);
  }
}

/**
 * It was reopened, so the points go back.
 *
 * Without this the leaderboard rewards closing things rather than
 * finishing them — mark done, collect, reopen, repeat — which is the
 * cheapest exploit in any system like this.
 */
export async function revokeForReopen(taskId: string): Promise<void> {
  try {
    const supabase = await createClient();

    const { data } = await supabase
      .from("tasks")
      .select("id, project_id, status")
      .eq("id", taskId)
      .maybeSingle();
    const task = data as { project_id: string; status: string } | null;
    if (!task || task.status === "done") return;

    const { data: assignees } = await supabase
      .from("task_assignees")
      .select("user_id")
      .eq("task_id", taskId);

    for (const row of (assignees ?? []) as { user_id: string }[]) {
      for (const event of ["task_completed", "completed_on_time", "completed_early"]) {
        await supabase.rpc("revoke_points", {
          p_project: task.project_id,
          p_user: row.user_id,
          p_dedupe: key(taskId, event),
          p_reason: "Task reopened",
        });
      }
    }
  } catch (error) {
    console.error("[tyriaq] could not take points back:", error);
  }
}

/**
 * Work that came out of review rather than straight to done.
 *
 * Reviewing is invisible labour in most trackers, and the person whose
 * work passed is the one paid here — the reviewer earns through kudos,
 * which is a judgement a person makes rather than one a status change
 * can infer.
 */
export async function awardForReviewPassed(taskId: string): Promise<void> {
  try {
    const supabase = await createClient();

    const { data } = await supabase
      .from("tasks")
      .select("id, project_id, status, priority")
      .eq("id", taskId)
      .maybeSingle();
    const task = data as { project_id: string; status: string; priority: string } | null;
    if (!task || task.status !== "done") return;

    const { data: assignees } = await supabase
      .from("task_assignees")
      .select("user_id")
      .eq("task_id", taskId);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    for (const row of (assignees ?? []) as { user_id: string }[]) {
      // Not when you approve your own work — which is not review.
      if (row.user_id === user?.id) continue;
      await supabase.rpc("award_points", {
        p_project: task.project_id,
        p_user: row.user_id,
        p_event: "review_passed",
        p_task: taskId,
        p_actor: user?.id ?? null,
        p_dedupe: key(taskId, "review_passed"),
        p_priority: task.priority,
      });
    }
  } catch (error) {
    console.error("[tyriaq] could not award review points:", error);
  }
}
