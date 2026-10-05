"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ScoreEvent, ScoreWeight } from "@/lib/data/scoring-types";
import type { ActionResult } from "./workspace";

/**
 * Setting up and adjusting how a project scores.
 *
 * Permission is the policy's — `managers write scoring rules` asks the
 * same question as changing who is in the space, because somebody who
 * could rewrite the rules they are measured by is not being measured.
 * These actions surface the refusal rather than repeating the check.
 */

export async function enableScoring(projectId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("enable_scoring", { p_project: projectId });
  if (error) return { error: error.message };

  revalidatePath("/projects", "layout");
  return { message: "Scoring is on, with a starting set of rules." };
}

export async function saveScoringRule(input: {
  id?: string;
  projectId: string;
  event: ScoreEvent;
  points: number;
  weight: ScoreWeight;
  dailyCap: number | null;
  enabled: boolean;
}): Promise<ActionResult> {
  if (!Number.isFinite(input.points)) return { error: "Points must be a number." };
  if (Math.abs(input.points) > 1000) return { error: "A rule cannot be worth more than 1000." };

  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("workspace_id")
    .eq("id", input.projectId)
    .maybeSingle();
  if (!project) return { error: "That project no longer exists." };

  const row = {
    project_id: input.projectId,
    workspace_id: (project as { workspace_id: string }).workspace_id,
    event: input.event,
    points: Math.round(input.points),
    weight: input.weight,
    daily_cap: input.dailyCap,
    enabled: input.enabled,
    updated_at: new Date().toISOString(),
  };

  const { error } = input.id
    ? await supabase.from("scoring_rules").update(row).eq("id", input.id)
    : await supabase.from("scoring_rules").insert(row);

  if (error) {
    return {
      error:
        error.code === "42501"
          ? "Only a space or workspace admin can change how this project scores."
          : error.code === "23505"
            ? "There is already a rule for that."
            : error.message,
    };
  }

  /*
    Changing a rule does NOT re-score what already happened.

    Every past award is a row that says what the rule paid at the time,
    and rewriting history because today's rule differs would mean
    somebody's total moving overnight for work they did last month.
  */
  revalidatePath("/projects", "layout");
  return { message: "Saved. It applies from now on." };
}

export async function deleteScoringRule(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("scoring_rules").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/projects", "layout");
  return { message: "Rule removed. Points already earned stay." };
}

/**
 * Thanking somebody.
 *
 * The budget, the self-check and the award all happen inside
 * `give_kudos`, because a kudos row without its points — or points
 * without the row — is a discrepancy nobody would notice until they
 * counted.
 */
export async function giveKudos(input: {
  projectId: string;
  toUserId: string;
  message: string;
  taskId?: string | null;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("give_kudos", {
    p_project: input.projectId,
    p_to: input.toUserId,
    p_message: input.message.trim().slice(0, 300),
    p_task: input.taskId ?? null,
  });

  if (error) return { error: error.message };

  revalidatePath("/projects", "layout");
  return { message: "Sent." };
}
