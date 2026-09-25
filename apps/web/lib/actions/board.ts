"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getCurrentWorkspace } from "@/lib/data/queries";
import type { TaskStatus } from "@/lib/data/task-types";
import type { ActionResult } from "./workspace";

/**
 * Board columns and saved views.
 *
 * Both are ways a team makes the product theirs, and both are small
 * enough that the writes are ordinary inserts — the rules that matter
 * live in policies and triggers, not here.
 */

const CATEGORIES: TaskStatus[] = ["todo", "in_progress", "review", "done", "blocked"];

function refresh() {
  revalidatePath("/projects", "layout");
}

/** Gives a project the five defaults so it has something to edit. */
export async function enableProjectStatuses(projectId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("seed_project_statuses", { p_project: projectId });
  if (error) return { error: error.message };
  refresh();
  return { message: "This board has its own columns now." };
}

export async function saveStatus(input: {
  id?: string;
  projectId: string;
  name: string;
  category: TaskStatus;
  color: string;
}): Promise<ActionResult> {
  const name = input.name.trim();
  if (!name) return { error: "Give the column a name." };
  if (!CATEGORIES.includes(input.category)) return { error: "Unknown category." };

  const supabase = await createClient();

  if (input.id) {
    const { error } = await supabase
      .from("project_statuses")
      .update({ name, category: input.category, color: input.color })
      .eq("id", input.id);
    if (error) {
      if (error.code === "23505") return { error: "This board already has a column with that name." };
      return { error: error.message };
    }
    refresh();
    return { message: "Column saved." };
  }

  const { data: project } = await supabase
    .from("projects")
    .select("workspace_id")
    .eq("id", input.projectId)
    .maybeSingle();
  if (!project) return { error: "That project no longer exists." };

  const { data: last } = await supabase
    .from("project_statuses")
    .select("position")
    .eq("project_id", input.projectId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("project_statuses").insert({
    project_id: input.projectId,
    workspace_id: (project as { workspace_id: string }).workspace_id,
    name,
    category: input.category,
    color: input.color,
    position: ((last as { position: number } | null)?.position ?? -1) + 1,
  });

  if (error) {
    if (error.code === "23505") return { error: "This board already has a column with that name." };
    return { error: error.message };
  }
  refresh();
  return { message: `${name} added.` };
}

/**
 * Removes a column.
 *
 * The tasks in it are not deleted — `on delete set null` puts them back
 * on their category, where they were before the board had columns of
 * its own. Losing work because somebody tidied a board would be an
 * unforgivable way to lose it.
 */
export async function deleteStatus(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("project_statuses").delete().eq("id", id);
  if (error) return { error: error.message };
  refresh();
  return { message: "Column removed. Its tasks are still there." };
}

export async function reorderStatuses(ids: string[]): Promise<ActionResult> {
  const supabase = await createClient();
  for (let index = 0; index < ids.length; index++) {
    const { error } = await supabase
      .from("project_statuses")
      .update({ position: index })
      .eq("id", ids[index]!);
    if (error) return { error: error.message };
  }
  refresh();
  return {};
}

/* ------------------------------------------------------------------ */
/* Saved views                                                         */
/* ------------------------------------------------------------------ */

export async function saveView(input: {
  name: string;
  projectId: string | null;
  layout: "list" | "board" | "calendar" | "gantt";
  config: Record<string, unknown>;
  isShared: boolean;
}): Promise<ActionResult & { id?: string }> {
  const name = input.name.trim();
  if (!name) return { error: "Give the view a name." };

  const user = await getCurrentUser();
  if (!user) return { error: "Sign in first." };
  const ws = await getCurrentWorkspace();
  if (!ws) return { error: "No workspace selected." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("saved_views")
    .insert({
      workspace_id: ws.id,
      project_id: input.projectId,
      name,
      layout: input.layout,
      config: input.config,
      is_shared: input.isShared,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  refresh();
  return { id: data?.id, message: `${name} saved.` };
}

export async function deleteView(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("saved_views").delete().eq("id", id);
  if (error) return { error: error.message };
  refresh();
  return { message: "View removed." };
}
