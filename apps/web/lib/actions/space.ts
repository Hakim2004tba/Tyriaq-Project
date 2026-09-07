"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace, getSpaces } from "@/lib/data/queries";
import { slugify, type SpaceColor } from "@/lib/data/types";
import type { ActionResult } from "./workspace";

const COLORS: SpaceColor[] = ["violet", "blue", "emerald", "amber", "rose", "cyan"];

function readDraft(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const icon = String(formData.get("icon") ?? "layers").trim() || "layers";
  const rawColor = String(formData.get("color") ?? "violet");
  // Never trust the client for an enum — an unexpected value would be
  // rejected by Postgres with an error nobody can act on.
  const color: SpaceColor = COLORS.includes(rawColor as SpaceColor) ? (rawColor as SpaceColor) : "violet";
  return { name, description, icon, color };
}

export async function createSpace(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { name, description, icon, color } = readDraft(formData);
  if (!name) return { error: "Give the space a name." };

  const ws = await getCurrentWorkspace();
  if (!ws) return { error: "No workspace selected." };

  const base = slugify(name);
  if (!base) return { error: "Use at least one letter or number." };

  // Slugs are unique per workspace, and spaces the caller can read are
  // already loaded — so uniqueness is resolved without another round trip.
  const existing = new Set((await getSpaces()).map((s) => s.slug));
  let slug = base;
  for (let n = 2; existing.has(slug) && n <= 50; n++) slug = `${base}-${n}`;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You are signed out." };

  const { error } = await supabase.from("spaces").insert({
    workspace_id: ws.id,
    name,
    slug,
    description,
    icon,
    color,
    created_by: user.id,
  });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { message: `${name} created.` };
}

export async function updateSpace(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const { name, description, icon, color } = readDraft(formData);
  if (!id) return { error: "Missing space." };
  if (!name) return { error: "Space name cannot be empty." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("spaces")
    .update({ name, description, icon, color })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { message: `${name} updated.` };
}

/** Archive and restore are the same operation with a different value —
 * splitting them into two actions would duplicate the permission path. */
export async function setSpaceArchived(id: string, archived: boolean): Promise<ActionResult> {
  if (!id) return { error: "Missing space." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("spaces")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { message: archived ? "Space archived." : "Space restored." };
}

/**
 * Permanent deletion. Admin-only at the database level, and it cascades to
 * every project in the space — which is why the UI asks first and offers
 * archiving as the reversible alternative.
 */
export async function deleteSpace(id: string): Promise<ActionResult> {
  if (!id) return { error: "Missing space." };

  const supabase = await createClient();
  const { error } = await supabase.from("spaces").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect("/spaces");
}
