"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import type { AutomationAction, AutomationTrigger } from "@/lib/automations/run";
import type { ActionResult } from "./workspace";

/**
 * Writing the rules.
 *
 * Permission is the policy's: `managers write automations` asks the
 * same question as changing who is in the space, because a rule acts on
 * everybody's tasks in a project. Nothing is re-checked here — what IS
 * done here is the validation a policy cannot express, like refusing an
 * action the runner would not recognise.
 */

const TRIGGERS: AutomationTrigger[] = [
  "task_created",
  "status_changed",
  "assigned",
  "due_soon",
  "priority_changed",
];

const ACTION_TYPES = ["assign", "set_priority", "set_status", "add_tag", "comment"];

export async function saveAutomation(input: {
  id?: string;
  projectId: string;
  name: string;
  trigger: AutomationTrigger;
  conditions: Record<string, string>;
  actions: AutomationAction[];
  enabled?: boolean;
}): Promise<ActionResult> {
  const name = input.name.trim();
  if (!name) return { error: "Give the rule a name." };
  if (!TRIGGERS.includes(input.trigger)) return { error: "Unknown trigger." };

  /*
    An action the runner does not recognise would be stored, shown as
    part of the rule, and silently do nothing every time it fired —
    which is worse than refusing it now.
  */
  const actions = input.actions.filter((action) => ACTION_TYPES.includes(action.type));
  if (actions.length === 0) return { error: "A rule needs at least one thing to do." };
  if (actions.length > 10) return { error: "Ten actions is the most a rule can do." };

  const user = await getCurrentUser();
  if (!user) return { error: "Sign in first." };

  const supabase = await createClient();

  // The workspace comes from the project, never from the caller — the
  // policy checks they match, and this is what makes them.
  const { data: project } = await supabase
    .from("projects")
    .select("workspace_id")
    .eq("id", input.projectId)
    .maybeSingle();
  if (!project) return { error: "That project no longer exists." };

  const row = {
    project_id: input.projectId,
    workspace_id: (project as { workspace_id: string }).workspace_id,
    name,
    trigger: input.trigger,
    conditions: input.conditions ?? {},
    actions,
    enabled: input.enabled ?? true,
    created_by: user.id,
    updated_at: new Date().toISOString(),
  };

  const { error } = input.id
    ? await supabase.from("automations").update(row).eq("id", input.id)
    : await supabase.from("automations").insert(row);

  if (error) {
    return {
      error:
        error.code === "42501"
          ? "Only a space or workspace admin can change automations."
          : error.message,
    };
  }

  revalidatePath("/projects", "layout");
  return { message: input.id ? "Rule saved." : "Rule created." };
}

export async function setAutomationEnabled(id: string, enabled: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("automations")
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/projects", "layout");
  return { message: enabled ? "Rule on." : "Rule paused." };
}

export async function deleteAutomation(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("automations").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/projects", "layout");
  return { message: "Rule removed." };
}
