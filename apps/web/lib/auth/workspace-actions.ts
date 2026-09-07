"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./actions";

/** "My Team!" → "my-team". Not exported: a "use server" module may only
 * export async functions, and every export becomes a callable endpoint. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

/**
 * Creates the caller's workspace.
 *
 * Goes through the `create_workspace` RPC rather than inserting directly:
 * `workspaces` has no INSERT policy, because a workspace and its owner
 * membership must be written in one transaction. A workspace with no
 * members would be invisible to everyone, including the person who just
 * made it.
 */
export async function createWorkspace(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Give your workspace a name." };
  if (name.length > 80) return { error: "That name is too long." };

  const base = slugify(name);
  if (!base) return { error: "Use at least one letter or number in the name." };

  const supabase = await createClient();

  // Slugs are globally unique, and `workspaces` is unreadable to
  // non-members — so availability has to be asked of the database rather
  // than discovered by a failed insert the user cannot interpret.
  let slug = base;
  for (let attempt = 2; attempt <= 20; attempt++) {
    const { data: available } = await supabase.rpc("workspace_slug_available", {
      candidate: slug,
    });
    if (available) break;
    slug = `${base}-${attempt}`;
  }

  const { error } = await supabase.rpc("create_workspace", {
    workspace_name: name,
    workspace_slug: slug,
  });

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
