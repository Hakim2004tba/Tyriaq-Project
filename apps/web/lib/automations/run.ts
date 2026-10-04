import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Running the rules a team wrote.
 *
 * Called by the actions that change a task, AFTER the change has
 * succeeded. Never before: a rule that fires and then has its trigger
 * rolled back has told everybody about something that did not happen.
 *
 * Nothing here throws. An automation is a convenience layered over the
 * work; if a rule is broken, the person's own edit must still stand,
 * and the failure belongs in the run log where its author can see it
 * rather than in their face as an error about somebody else's rule.
 */

export type AutomationTrigger =
  | "task_created"
  | "status_changed"
  | "assigned"
  | "due_soon"
  | "priority_changed";

export interface AutomationAction {
  type: "assign" | "set_priority" | "set_status" | "add_tag" | "comment";
  user_id?: string;
  priority?: string;
  status_id?: string;
  tag?: string;
  body?: string;
}

interface AutomationRow {
  id: string;
  name: string;
  trigger: string;
  conditions: Record<string, string>;
  actions: AutomationAction[];
}

export interface TriggerContext {
  taskId: string;
  projectId: string;
  trigger: AutomationTrigger;
  /**
   * Generation. 0 is a person's own change; 1 is a rule reacting to one.
   *
   * The runner refuses to go further, so "when Done, set Archived" —
   * which would re-enter itself forever — fires exactly once and is
   * logged as skipped the second time. Narrower than a cycle detector,
   * and far easier to explain to the person whose rule stopped.
   */
  depth?: number;
  /** What the task looks like now, for conditions to match against. */
  after?: { statusId?: string | null; category?: string; priority?: string };
}

const MAX_DEPTH = 1;

export async function runAutomations(context: TriggerContext): Promise<void> {
  const depth = context.depth ?? 0;

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("automations")
      .select("id, name, trigger, conditions, actions")
      .eq("project_id", context.projectId)
      .eq("trigger", context.trigger)
      .eq("enabled", true);

    if (error || !data || data.length === 0) return;
    const rules = data as unknown as AutomationRow[];

    for (const rule of rules) {
      if (depth > MAX_DEPTH) {
        /*
          Logged rather than silently dropped. "Why did my rule not
          run?" is the question this table exists to answer, and
          "because another rule had already run" is the answer.
        */
        await log(rule.id, context.taskId, depth, "skipped", "A rule cannot start another rule.");
        continue;
      }

      if (!matches(rule.conditions, context)) continue;

      const problems: string[] = [];
      for (const action of rule.actions ?? []) {
        const problem = await apply(action, context, depth);
        if (problem) problems.push(problem);
      }

      await log(
        rule.id,
        context.taskId,
        depth,
        problems.length > 0 ? "failed" : "ok",
        problems.length > 0 ? problems.join("; ") : `Ran ${rule.actions?.length ?? 0} action(s).`
      );
    }
  } catch (error) {
    // The person's own edit already landed; this must not undo it.
    console.error("[tyriaq] automations failed to run:", error);
  }
}

/**
 * Whether a rule's conditions describe what just happened.
 *
 * Absent keys match everything, which is what makes an empty
 * `conditions` mean "whenever the trigger fires" rather than "never".
 */
function matches(conditions: Record<string, string>, context: TriggerContext): boolean {
  const after = context.after ?? {};
  if (conditions.status_id && conditions.status_id !== after.statusId) return false;
  if (conditions.category && conditions.category !== after.category) return false;
  if (conditions.priority && conditions.priority !== after.priority) return false;
  return true;
}

async function apply(
  action: AutomationAction,
  context: TriggerContext,
  depth: number
): Promise<string | null> {
  const supabase = await createClient();

  switch (action.type) {
    case "assign": {
      if (!action.user_id) return "assign: no person named";
      const { error } = await supabase.from("task_assignees").insert({
        task_id: context.taskId,
        user_id: action.user_id,
        // Replaced by the trigger with the task's real workspace.
        workspace_id: context.taskId,
      });
      // Already assigned is the rule's intent satisfied, not a failure.
      if (error && error.code !== "23505") return `assign: ${error.message}`;
      return null;
    }

    case "set_priority": {
      if (!action.priority) return "priority: none given";
      const { error } = await supabase
        .from("tasks")
        .update({ priority: action.priority })
        .eq("id", context.taskId);
      return error ? `priority: ${error.message}` : null;
    }

    case "set_status": {
      if (!action.status_id) return "status: none given";
      const { error } = await supabase
        .from("tasks")
        .update({ status_id: action.status_id })
        .eq("id", context.taskId);
      if (error) return `status: ${error.message}`;

      /*
        This change can itself trigger rules — at depth + 1, which the
        loop above refuses to act on. The call is still made so the
        attempt is logged, and whoever reads the log can see exactly
        where their chain stopped.
      */
      await runAutomations({
        ...context,
        trigger: "status_changed",
        depth: depth + 1,
        after: { ...context.after, statusId: action.status_id },
      });
      return null;
    }

    case "add_tag": {
      if (!action.tag) return "tag: none given";
      const { data: task } = await supabase
        .from("tasks")
        .select("tags")
        .eq("id", context.taskId)
        .maybeSingle();
      const tags = ((task?.tags as string[] | null) ?? []).slice();
      if (tags.includes(action.tag)) return null;
      tags.push(action.tag);
      const { error } = await supabase
        .from("tasks")
        .update({ tags: tags.slice(0, 20) })
        .eq("id", context.taskId);
      return error ? `tag: ${error.message}` : null;
    }

    case "comment": {
      if (!action.body?.trim()) return "comment: empty";
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return "comment: nobody to write it as";
      const { error } = await supabase.from("task_comments").insert({
        task_id: context.taskId,
        workspace_id: context.taskId,
        author_id: user.id,
        body: action.body.trim().slice(0, 2000),
      });
      return error ? `comment: ${error.message}` : null;
    }

    default:
      return `unknown action: ${String((action as { type: string }).type)}`;
  }
}

async function log(
  automationId: string,
  taskId: string,
  depth: number,
  status: "ok" | "skipped" | "failed",
  detail: string
): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.rpc("record_automation_run", {
      p_automation: automationId,
      p_task: taskId,
      p_depth: depth,
      p_status: status,
      p_detail: detail,
    });
  } catch (error) {
    console.error("[tyriaq] could not record an automation run:", error);
  }
}
