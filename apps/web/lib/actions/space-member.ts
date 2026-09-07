"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import type { PermissionLevel } from "@/lib/data/permissions";
import type { ActionResult } from "./workspace";

/**
 * Space membership.
 *
 * The level granted here is what every project in the space inherits.
 * Permissions are the database's to enforce — `can_manage_space` decides
 * who may change a roster, and the trigger refuses anybody who is not in
 * the workspace, so neither is re-implemented here.
 */

const LEVELS: PermissionLevel[] = ["viewer", "commenter", "editor", "admin"];

export interface SpaceMemberRow {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  level: PermissionLevel;
}

export async function getSpaceMembers(spaceId: string): Promise<SpaceMemberRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("space_members")
    .select("user_id, level, profiles!user_id(id, full_name, avatar_url)")
    .eq("space_id", spaceId);

  return ((data ?? []) as unknown as {
    user_id: string; level: PermissionLevel;
    profiles: { id: string; full_name: string; avatar_url: string | null } | null;
  }[]).map((row) => ({
    userId: row.user_id,
    name: row.profiles?.full_name || "Unknown",
    email: "",
    avatarUrl: row.profiles?.avatar_url ?? null,
    level: row.level,
  }));
}

export async function addSpaceMember(
  spaceId: string,
  userId: string,
  level: PermissionLevel
): Promise<ActionResult> {
  if (!LEVELS.includes(level)) return { error: "Unknown permission level." };

  const user = await getCurrentUser();
  const supabase = await createClient();
  const { error } = await supabase.from("space_members").insert({
    space_id: spaceId,
    user_id: userId,
    // Replaced by the trigger with the space's real workspace.
    workspace_id: spaceId,
    level,
    added_by: user?.id ?? null,
  });

  if (error) {
    if (error.code === "23505") return { error: "They are already in this space." };
    return { error: error.message };
  }
  revalidatePath("/spaces", "layout");
  return {};
}

export async function setSpaceMemberLevel(
  spaceId: string,
  userId: string,
  level: PermissionLevel
): Promise<ActionResult> {
  if (!LEVELS.includes(level)) return { error: "Unknown permission level." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("space_members")
    .update({ level })
    .eq("space_id", spaceId)
    .eq("user_id", userId);

  if (error) return { error: error.message };
  revalidatePath("/spaces", "layout");
  return {};
}

export async function removeSpaceMember(spaceId: string, userId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("space_members")
    .delete()
    .eq("space_id", spaceId)
    .eq("user_id", userId);

  if (error) return { error: error.message };
  revalidatePath("/spaces", "layout");
  return {};
}
