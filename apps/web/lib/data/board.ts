import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { reportReadError } from "./report";
import { getCurrentWorkspace } from "./queries";
import type { TaskStatus } from "./task-types";

/**
 * A board's own columns, and the views saved over it.
 *
 * Both are per project and both are small — a handful of rows each — so
 * they are read plainly and passed down as props rather than fetched by
 * the components that draw them.
 */

export interface ProjectStatus {
  id: string;
  name: string;
  /** What the product understands this column to mean. */
  category: TaskStatus;
  color: string;
  position: number;
}

export interface SavedView {
  id: string;
  name: string;
  layout: "list" | "board" | "calendar" | "gantt";
  config: Record<string, unknown>;
  isShared: boolean;
  createdBy: string;
}

/**
 * The columns this project uses.
 *
 * Empty means it has never defined any, and every view falls back to
 * the five built-in statuses — which is every project until somebody
 * opens the board settings.
 */
export const getProjectStatuses = cache(async (projectId: string): Promise<ProjectStatus[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_statuses")
    .select("id, name, category, color, position")
    .eq("project_id", projectId)
    .order("position", { ascending: true });

  reportReadError("getProjectStatuses", error);
  return (data ?? []) as ProjectStatus[];
});

export const getSavedViews = cache(async (projectId: string | null): Promise<SavedView[]> => {
  const ws = await getCurrentWorkspace();
  if (!ws) return [];

  const supabase = await createClient();
  let query = supabase
    .from("saved_views")
    .select("id, name, layout, config, is_shared, created_by")
    .eq("workspace_id", ws.id)
    .order("position_hint", { ascending: true })
    .order("created_at", { ascending: true });

  /*
    A project's own views plus the workspace-wide ones — "My overdue
    work" is a question worth asking on every board, and having to save
    it once per project is how a feature stops being used.
  */
  query = projectId ? query.or(`project_id.is.null,project_id.eq.${projectId}`) : query.is("project_id", null);

  const { data, error } = await query;
  reportReadError("getSavedViews", error);

  return ((data ?? []) as {
    id: string; name: string; layout: SavedView["layout"];
    config: Record<string, unknown>; is_shared: boolean; created_by: string;
  }[]).map((row) => ({
    id: row.id,
    name: row.name,
    layout: row.layout,
    config: row.config ?? {},
    isShared: row.is_shared,
    createdBy: row.created_by,
  }));
});
