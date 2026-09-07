"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/data/queries";
import { slugify, type ProjectStatus, type SpaceColor } from "@/lib/data/types";
import type { ActionResult } from "./workspace";

const COLORS: SpaceColor[] = ["violet", "blue", "emerald", "amber", "rose", "cyan"];
const STATUSES: ProjectStatus[] = ["on_track", "at_risk", "off_track", "on_hold", "completed"];

/** A date input gives "" when cleared; the column wants null, not "". */
function readDate(formData: FormData, key: string): string | null {
  const v = String(formData.get(key) ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

export async function createProject(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const spaceId = String(formData.get("spaceId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const rawColor = String(formData.get("color") ?? "violet");
  const color: SpaceColor = COLORS.includes(rawColor as SpaceColor) ? (rawColor as SpaceColor) : "violet";

  if (!spaceId) return { error: "Choose a space for this project." };
  if (!name) return { error: "Give the project a name." };

  const ws = await getCurrentWorkspace();
  if (!ws) return { error: "No workspace selected." };

  const base = slugify(name);
  if (!base) return { error: "Use at least one letter or number." };

  const supabase = await createClient();

  // `projects` is unreadable to non-members, so a taken slug cannot be
  // discovered by querying — the database has to answer.
  let slug = base;
  for (let n = 2; n <= 25; n++) {
    const { data: free } = await supabase.rpc("project_slug_available", {
      ws: ws.id,
      candidate: slug,
    });
    if (free) break;
    slug = `${base}-${n}`;
  }

  // The RPC also makes the caller the project lead, in the same
  // transaction — a project nobody leads is nobody's responsibility.
  const { error } = await supabase.rpc("create_project", {
    target_space_id: spaceId,
    project_name: name,
    project_slug: slug,
    project_description: description,
    project_color: color,
  });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { message: `${name} created.` };
}

export async function updateProject(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const rawStatus = String(formData.get("status") ?? "on_track");
  const rawColor = String(formData.get("color") ?? "violet");
  const spaceId = String(formData.get("spaceId") ?? "");

  if (!id) return { error: "Missing project." };
  if (!name) return { error: "Project name cannot be empty." };

  const status: ProjectStatus = STATUSES.includes(rawStatus as ProjectStatus)
    ? (rawStatus as ProjectStatus)
    : "on_track";
  const color: SpaceColor = COLORS.includes(rawColor as SpaceColor) ? (rawColor as SpaceColor) : "violet";

  const startDate = readDate(formData, "startDate");
  const dueDate = readDate(formData, "dueDate");
  if (startDate && dueDate && startDate > dueDate) {
    return { error: "The start date cannot be after the due date." };
  }

  const supabase = await createClient();
  const patch: Record<string, unknown> = {
    name,
    description,
    status,
    color,
    start_date: startDate,
    due_date: dueDate,
  };
  // Moving a project between spaces is allowed; the database trigger
  // re-derives workspace_id from the new space rather than trusting input.
  if (spaceId) patch.space_id = spaceId;

  const { error } = await supabase.from("projects").update(patch).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { message: "Project updated." };
}

export async function setProjectArchived(id: string, archived: boolean): Promise<ActionResult> {
  if (!id) return { error: "Missing project." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { message: archived ? "Project archived." : "Project restored." };
}

export async function deleteProject(id: string): Promise<ActionResult> {
  if (!id) return { error: "Missing project." };

  const supabase = await createClient();
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect("/projects");
}

/* ---------------------------------------------------------------- */
/* Members                                                            */
/* ---------------------------------------------------------------- */

export async function addProjectMember(projectId: string, userId: string): Promise<ActionResult> {
  if (!projectId || !userId) return { error: "Missing project or person." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("project_members")
    .insert({ project_id: projectId, user_id: userId, role: "member" });

  // The database refuses anyone who is not already in the workspace; its
  // message says exactly that, so it is worth surfacing verbatim.
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { message: "Member added." };
}

export async function removeProjectMember(projectId: string, userId: string): Promise<ActionResult> {
  if (!projectId || !userId) return { error: "Missing project or person." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("project_members")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", userId);
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { message: "Member removed." };
}

export async function setProjectLead(projectId: string, userId: string): Promise<ActionResult> {
  if (!projectId || !userId) return { error: "Missing project or person." };

  const supabase = await createClient();

  // Demote the current lead first: "lead" is a role on the roster rather
  // than a column, so two rows could otherwise both claim it.
  const { error: demote } = await supabase
    .from("project_members")
    .update({ role: "member" })
    .eq("project_id", projectId)
    .eq("role", "lead");
  if (demote) return { error: demote.message };

  const { error } = await supabase
    .from("project_members")
    .update({ role: "lead" })
    .eq("project_id", projectId)
    .eq("user_id", userId);
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { message: "Lead updated." };
}
