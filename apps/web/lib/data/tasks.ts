import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { reportReadError } from "./report";
import { getCurrentUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  emptyDetail,
  offsetFromISO,
  type Person,
  type ProjectTask,
  type TaskDetail,
} from "./task-types";

/**
 * Task reads.
 *
 * As with every other query here, nothing filters by workspace in
 * application code — RLS decides what exists. A `.eq("workspace_id", …)`
 * would look like the security boundary and quietly become the only one
 * the day a policy is dropped.
 *
 * Tasks, assignees and dependencies are three round trips rather than
 * one nested select, because PostgREST embeds cost a join per row and
 * the board asks for the whole project at once. Three flat reads
 * assembled in memory is both faster and easier to reason about.
 */

export interface TaskBundle {
  tasks: ProjectTask[];
  details: Record<string, TaskDetail>;
}

type TaskRow = {
  id: string;
  project_id: string;
  parent_task_id: string | null;
  title: string;
  description: string;
  status: ProjectTask["status"];
  priority: ProjectTask["priority"];
  start_date: string | null;
  due_date: string | null;
  tags: string[] | null;
  is_milestone: boolean;
  position: number;
};

const TASK_COLUMNS =
  "id, project_id, parent_task_id, title, description, status, priority, start_date, due_date, tags, is_milestone, position";

const EMPTY: TaskBundle = { tasks: [], details: {} };

/** Every task in one project, including its subtasks. */
export const getProjectTasks = cache(async (projectId: string): Promise<TaskBundle> => {
  return loadTasks((q) => q.eq("project_id", projectId));
});

/** Every task the caller can see — the workspace-wide calendar's source. */
export const getWorkspaceTasks = cache(async (): Promise<TaskBundle> => {
  return loadTasks((q) => q);
});

/* eslint-disable @typescript-eslint/no-explicit-any */
async function loadTasks(filter: (query: any) => any): Promise<TaskBundle> {
  if (!isSupabaseConfigured) return EMPTY;
  const user = await getCurrentUser();
  if (!user) return EMPTY;

  const supabase = await createClient();

  const { data: taskRows, error: tasksError } = await filter(
    supabase.from("tasks").select(TASK_COLUMNS).order("position", { ascending: true })
  );
  reportReadError("loadTasks", tasksError);
  const rows = (taskRows ?? []) as unknown as TaskRow[];
  if (rows.length === 0) return EMPTY;

  const ids = rows.map((r) => r.id);

  const [
    { data: assigneeRows, error: assigneeError },
    { data: dependencyRows, error: dependencyError },
    { data: starRows, error: starError },
  ] = await Promise.all([
    supabase
      .from("task_assignees")
      // Unhinted on purpose: only one key from this column reaches
      // `profiles`, and naming it would tie the query to how this
      // particular database happened to be built.
      .select("task_id, user_id, profiles(id, full_name, avatar_url)")
      .in("task_id", ids),
    supabase
      .from("task_dependencies")
      .select("predecessor_id, successor_id")
      .in("predecessor_id", ids),
    // RLS limits this to the caller's own rows, so no user filter here.
    supabase.from("task_stars").select("task_id").in("task_id", ids),
  ]);

  reportReadError("loadTasks:assignees", assigneeError);
  reportReadError("loadTasks:dependencies", dependencyError);
  reportReadError("loadTasks:stars", starError);

  const assignees = new Map<string, Person[]>();
  for (const row of (assigneeRows ?? []) as unknown as {
    task_id: string;
    user_id: string;
    profiles: { id: string; full_name: string; avatar_url: string | null } | null;
  }[]) {
    const person: Person = {
      id: row.user_id,
      name: row.profiles?.full_name || "Unknown",
      avatarUrl: row.profiles?.avatar_url ?? null,
    };
    const list = assignees.get(row.task_id);
    if (list) list.push(person);
    else assignees.set(row.task_id, [person]);
  }

  const blocks = new Map<string, string[]>();
  for (const row of (dependencyRows ?? []) as unknown as { predecessor_id: string; successor_id: string }[]) {
    const list = blocks.get(row.predecessor_id);
    if (list) list.push(row.successor_id);
    else blocks.set(row.predecessor_id, [row.successor_id]);
  }

  // Subtask counters come from the child rows themselves, so the chip in
  // the list and the checklist in the panel can never disagree — they
  // are two renderings of one set of rows.
  const children = new Map<string, TaskRow[]>();
  for (const row of rows) {
    if (!row.parent_task_id) continue;
    const list = children.get(row.parent_task_id);
    if (list) list.push(row);
    else children.set(row.parent_task_id, [row]);
  }

  const starred = new Set(
    ((starRows ?? []) as unknown as { task_id: string }[]).map((row) => row.task_id)
  );

  const tasks = rows.map((row) =>
    toTask(row, assignees.get(row.id) ?? [], blocks.get(row.id), children.get(row.id), starred.has(row.id))
  );

  const details: Record<string, TaskDetail> = {};
  for (const row of rows) {
    const detail = emptyDetail(row.description);
    detail.subtaskItems = (children.get(row.id) ?? []).map((c) => ({
      id: c.id,
      title: c.title,
      done: c.status === "done",
    }));
    details[row.id] = detail;
  }

  return { tasks, details };
}

function toTask(
  row: TaskRow,
  assignees: Person[],
  blocks: string[] | undefined,
  children: TaskRow[] | undefined,
  starred: boolean
): ProjectTask {
  return {
    id: row.id,
    projectId: row.project_id,
    parentId: row.parent_task_id,
    title: row.title,
    status: row.status,
    priority: row.priority,
    assignees,
    startOffset: offsetFromISO(row.start_date),
    dueOffset: offsetFromISO(row.due_date),
    tags: row.tags ?? [],
    milestone: row.is_milestone,
    position: row.position,
    starred,
    blocks: blocks ?? [],
    subtasks: children?.length
      ? { done: children.filter((c) => c.status === "done").length, total: children.length }
      : undefined,
  };
}
