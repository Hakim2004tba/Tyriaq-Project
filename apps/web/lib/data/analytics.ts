import { createClient } from "@/lib/supabase/server";
import { reportReadError } from "./report";
import { getCurrentUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Person, Priority, TaskStatus } from "./task-types";

/**
 * Reporting.
 *
 * Aggregation happens here, in one pass over rows the database has
 * already filtered, rather than in a dozen `count(*)` round trips. Only
 * the columns each figure needs are fetched — a report over a year of
 * tasks should not carry their descriptions across the wire.
 *
 * Nothing scopes to a workspace in application code: RLS does. The date,
 * project and member filters are narrowing what the reader asked for,
 * not what they are allowed to see, and the difference matters — if the
 * filters were the boundary, an empty filter would mean "everything".
 *
 * At workspace scale this is right. If a workspace ever holds hundreds
 * of thousands of tasks, these become SQL aggregates behind a view; the
 * shape returned here is what that view would have to produce.
 */

export interface ReportFilters {
  /** Inclusive ISO dates. */
  from: string;
  to: string;
  projectId: string | null;
  memberId: string | null;
}

export interface SeriesPoint {
  date: string;
  created: number;
  completed: number;
}

export interface CategoryCount {
  key: string;
  label: string;
  count: number;
}

export interface ProjectRow {
  id: string;
  name: string;
  slug: string;
  total: number;
  done: number;
  overdue: number;
  minutes: number;
  progress: number;
}

export interface MemberRow {
  id: string;
  name: string;
  completed: number;
  assigned: number;
  overdue: number;
  minutes: number;
  /** Share of their assigned work that is finished. */
  completionRate: number;
}

export interface ActivityRow {
  id: string;
  actorName: string;
  kind: string;
  text: string;
  detail: string | null;
  createdAt: string;
  taskTitle: string | null;
  projectSlug: string | null;
}

export interface ReportData {
  totals: {
    created: number;
    completed: number;
    completionRate: number;
    overdue: number;
    minutes: number;
    openTasks: number;
    /** Same figures for the equivalent window immediately before. */
    previous: { created: number; completed: number; completionRate: number; minutes: number };
  };
  series: SeriesPoint[];
  byStatus: CategoryCount[];
  byPriority: CategoryCount[];
  projects: ProjectRow[];
  members: MemberRow[];
  timeByProject: { id: string; name: string; minutes: number }[];
  workload: { id: string; name: string; open: number; overdue: number }[];
  activity: ActivityRow[];
}

const EMPTY: ReportData = {
  totals: {
    created: 0, completed: 0, completionRate: 0, overdue: 0, minutes: 0, openTasks: 0,
    previous: { created: 0, completed: 0, completionRate: 0, minutes: 0 },
  },
  series: [], byStatus: [], byPriority: [], projects: [], members: [],
  timeByProject: [], workload: [], activity: [],
};

const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  review: "In review",
  done: "Done",
  blocked: "Blocked",
};

const PRIORITY_LABEL: Record<Priority, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
};

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

/** Every date in the window, so a quiet day is a zero rather than a gap. */
function eachDay(from: string, to: string): string[] {
  const days: string[] = [];
  const cursor = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  while (cursor <= end && days.length < 400) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export async function getReportData(filters: ReportFilters): Promise<ReportData> {
  if (!isSupabaseConfigured) return EMPTY;
  const user = await getCurrentUser();
  if (!user) return EMPTY;

  const supabase = await createClient();

  const fromTs = `${filters.from}T00:00:00.000Z`;
  const toTs = `${filters.to}T23:59:59.999Z`;

  // The window immediately before this one, of the same length — what
  // "up 12% on the previous period" has to be measured against.
  const spanDays = Math.max(1, eachDay(filters.from, filters.to).length);
  const previousFrom = new Date(`${filters.from}T00:00:00`);
  previousFrom.setDate(previousFrom.getDate() - spanDays);
  const previousFromIso = previousFrom.toISOString().slice(0, 10);

  let taskQuery = supabase
    .from("tasks")
    .select("id, title, project_id, status, priority, due_date, created_at, updated_at, parent_task_id")
    .is("parent_task_id", null)
    .gte("created_at", `${previousFromIso}T00:00:00.000Z`);
  if (filters.projectId) taskQuery = taskQuery.eq("project_id", filters.projectId);

  let timeQuery = supabase
    .from("time_entries")
    .select("project_id, user_id, minutes, spent_on")
    .gte("spent_on", previousFromIso)
    .lte("spent_on", filters.to);
  if (filters.projectId) timeQuery = timeQuery.eq("project_id", filters.projectId);
  if (filters.memberId) timeQuery = timeQuery.eq("user_id", filters.memberId);

  const [
    { data: taskRows, error: taskError },
    { data: openRows, error: openError },
    { data: timeRows, error: timeError },
    { data: assigneeRows, error: assigneeError },
    { data: projectRows, error: projectError },
    { data: memberRows, error: memberError },
    { data: activityRows, error: activityError },
  ] = await Promise.all([
    taskQuery,
    /*
      Open work is a snapshot, not a window: "12 overdue" means right
      now, whatever date range the reader is looking at. Filtering these
      by creation date would quietly exclude old tasks, which are
      precisely the ones most likely to be overdue.
    */
    supabase
      .from("tasks")
      .select("id, project_id, status, priority, due_date")
      .is("parent_task_id", null)
      .neq("status", "done"),
    timeQuery,
    supabase.from("task_assignees").select("task_id, user_id"),
    supabase.from("projects").select("id, name, slug, archived_at"),
    supabase.from("workspace_members").select("user_id, profiles(id, full_name)"),
    supabase
      .from("task_activity")
      .select("id, kind, text, detail, created_at, actor_id, task_id, profiles(full_name), tasks(title, projects(slug))")
      .gte("created_at", fromTs)
      .lte("created_at", toTs)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  reportReadError("getReportData:tasks", taskError);
  reportReadError("getReportData:open", openError);
  reportReadError("getReportData:time", timeError);
  reportReadError("getReportData:assignees", assigneeError);
  reportReadError("getReportData:projects", projectError);
  reportReadError("getReportData:members", memberError);
  reportReadError("getReportData:activity", activityError);

  type TaskRow = {
    id: string; title: string; project_id: string; status: TaskStatus; priority: Priority;
    due_date: string | null; created_at: string; updated_at: string;
  };

  const tasks = (taskRows ?? []) as unknown as TaskRow[];
  const open = (openRows ?? []) as unknown as {
    id: string; project_id: string; status: TaskStatus; priority: Priority; due_date: string | null;
  }[];
  const time = (timeRows ?? []) as unknown as {
    project_id: string; user_id: string; minutes: number; spent_on: string;
  }[];

  // Assignees drive both the member filter and the workload chart.
  const assigneesByTask = new Map<string, string[]>();
  for (const row of (assigneeRows ?? []) as unknown as { task_id: string; user_id: string }[]) {
    const list = assigneesByTask.get(row.task_id);
    if (list) list.push(row.user_id);
    else assigneesByTask.set(row.task_id, [row.user_id]);
  }

  const people = new Map<string, Person>();
  for (const row of (memberRows ?? []) as unknown as {
    user_id: string; profiles: { id: string; full_name: string } | null;
  }[]) {
    people.set(row.user_id, { id: row.user_id, name: row.profiles?.full_name || "Unknown" });
  }

  const projects = new Map<string, { id: string; name: string; slug: string; archived: boolean }>();
  for (const row of (projectRows ?? []) as unknown as {
    id: string; name: string; slug: string; archived_at: string | null;
  }[]) {
    projects.set(row.id, {
      id: row.id, name: row.name, slug: row.slug, archived: row.archived_at !== null,
    });
  }

  const mine = (taskId: string) =>
    !filters.memberId || (assigneesByTask.get(taskId) ?? []).includes(filters.memberId);

  const inWindow = (iso: string) => iso >= fromTs && iso <= toTs;
  const inPrevious = (iso: string) =>
    iso >= `${previousFromIso}T00:00:00.000Z` && iso < fromTs;

  /*
    A task counts as completed on the day it last changed while sitting
    in `done`. There is no completed_at column; `updated_at` is the
    closest honest signal, and a task edited after completion moves with
    it — a real limitation, noted rather than hidden.
  */
  const completedAt = (task: TaskRow) => (task.status === "done" ? task.updated_at : null);

  const days = eachDay(filters.from, filters.to);
  const createdByDay = new Map<string, number>();
  const completedByDay = new Map<string, number>();

  let created = 0;
  let completed = 0;
  let previousCreated = 0;
  let previousCompleted = 0;

  for (const task of tasks) {
    if (!mine(task.id)) continue;

    if (inWindow(task.created_at)) {
      created += 1;
      const key = dayKey(task.created_at);
      createdByDay.set(key, (createdByDay.get(key) ?? 0) + 1);
    } else if (inPrevious(task.created_at)) {
      previousCreated += 1;
    }

    const done = completedAt(task);
    if (!done) continue;
    if (inWindow(done)) {
      completed += 1;
      const key = dayKey(done);
      completedByDay.set(key, (completedByDay.get(key) ?? 0) + 1);
    } else if (inPrevious(done)) {
      previousCompleted += 1;
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const openFiltered = open.filter(
    (task) => mine(task.id) && (!filters.projectId || task.project_id === filters.projectId)
  );
  const overdue = openFiltered.filter((t) => t.due_date !== null && t.due_date < today).length;

  const byStatusCount = new Map<TaskStatus, number>();
  const byPriorityCount = new Map<Priority, number>();
  for (const task of openFiltered) {
    byStatusCount.set(task.status, (byStatusCount.get(task.status) ?? 0) + 1);
    byPriorityCount.set(task.priority, (byPriorityCount.get(task.priority) ?? 0) + 1);
  }
  // `done` is not in the open snapshot, so the completed count comes from
  // the window instead — otherwise the donut would claim nothing is done.
  byStatusCount.set("done", completed);

  let minutes = 0;
  let previousMinutes = 0;
  const minutesByProject = new Map<string, number>();
  const minutesByPerson = new Map<string, number>();
  for (const entry of time) {
    if (entry.spent_on >= filters.from && entry.spent_on <= filters.to) {
      minutes += entry.minutes;
      minutesByProject.set(entry.project_id, (minutesByProject.get(entry.project_id) ?? 0) + entry.minutes);
      minutesByPerson.set(entry.user_id, (minutesByPerson.get(entry.user_id) ?? 0) + entry.minutes);
    } else if (entry.spent_on >= previousFromIso && entry.spent_on < filters.from) {
      previousMinutes += entry.minutes;
    }
  }

  const projectTotals = new Map<string, ProjectRow>();
  for (const task of tasks) {
    if (!mine(task.id)) continue;
    const project = projects.get(task.project_id);
    if (!project || project.archived) continue;

    const row = projectTotals.get(project.id) ?? {
      id: project.id, name: project.name, slug: project.slug,
      total: 0, done: 0, overdue: 0, minutes: 0, progress: 0,
    };
    row.total += 1;
    if (task.status === "done") row.done += 1;
    else if (task.due_date && task.due_date < today) row.overdue += 1;
    projectTotals.set(project.id, row);
  }
  for (const row of projectTotals.values()) {
    row.minutes = minutesByProject.get(row.id) ?? 0;
    row.progress = row.total > 0 ? Math.round((row.done / row.total) * 100) : 0;
  }

  const memberTotals = new Map<string, MemberRow>();
  const ensureMember = (id: string): MemberRow => {
    const existing = memberTotals.get(id);
    if (existing) return existing;
    const row: MemberRow = {
      id, name: people.get(id)?.name ?? "Unknown",
      completed: 0, assigned: 0, overdue: 0, minutes: 0, completionRate: 0,
    };
    memberTotals.set(id, row);
    return row;
  };

  for (const task of tasks) {
    for (const personId of assigneesByTask.get(task.id) ?? []) {
      if (filters.memberId && personId !== filters.memberId) continue;
      const row = ensureMember(personId);
      row.assigned += 1;
      const done = completedAt(task);
      if (done && inWindow(done)) row.completed += 1;
    }
  }
  for (const task of openFiltered) {
    if (!task.due_date || task.due_date >= today) continue;
    for (const personId of assigneesByTask.get(task.id) ?? []) {
      if (filters.memberId && personId !== filters.memberId) continue;
      ensureMember(personId).overdue += 1;
    }
  }
  for (const [personId, personMinutes] of minutesByPerson) {
    ensureMember(personId).minutes = personMinutes;
  }
  for (const row of memberTotals.values()) {
    row.completionRate = row.assigned > 0 ? Math.round((row.completed / row.assigned) * 100) : 0;
  }

  const workload = new Map<string, { id: string; name: string; open: number; overdue: number }>();
  for (const task of openFiltered) {
    for (const personId of assigneesByTask.get(task.id) ?? []) {
      const row = workload.get(personId) ?? {
        id: personId, name: people.get(personId)?.name ?? "Unknown", open: 0, overdue: 0,
      };
      row.open += 1;
      if (task.due_date && task.due_date < today) row.overdue += 1;
      workload.set(personId, row);
    }
  }

  const activity: ActivityRow[] = ((activityRows ?? []) as unknown as {
    id: string; kind: string; text: string; detail: string | null; created_at: string;
    profiles: { full_name: string } | null;
    tasks: { title: string; projects: { slug: string } | null } | null;
  }[]).map((row) => ({
    id: row.id,
    actorName: row.profiles?.full_name || "Someone",
    kind: row.kind,
    text: row.text,
    detail: row.detail,
    createdAt: row.created_at,
    taskTitle: row.tasks?.title ?? null,
    projectSlug: row.tasks?.projects?.slug ?? null,
  }));

  const rate = (done: number, made: number) => (made > 0 ? Math.round((done / made) * 100) : 0);

  return {
    totals: {
      created,
      completed,
      completionRate: rate(completed, created),
      overdue,
      minutes,
      openTasks: openFiltered.length,
      previous: {
        created: previousCreated,
        completed: previousCompleted,
        completionRate: rate(previousCompleted, previousCreated),
        minutes: previousMinutes,
      },
    },
    series: days.map((date) => ({
      date,
      created: createdByDay.get(date) ?? 0,
      completed: completedByDay.get(date) ?? 0,
    })),
    byStatus: (Object.keys(STATUS_LABEL) as TaskStatus[]).map((status) => ({
      key: status,
      label: STATUS_LABEL[status],
      count: byStatusCount.get(status) ?? 0,
    })),
    byPriority: (Object.keys(PRIORITY_LABEL) as Priority[]).map((priority) => ({
      key: priority,
      label: PRIORITY_LABEL[priority],
      count: byPriorityCount.get(priority) ?? 0,
    })),
    projects: Array.from(projectTotals.values()).sort((a, b) => b.total - a.total),
    members: Array.from(memberTotals.values()).sort((a, b) => b.completed - a.completed),
    timeByProject: Array.from(minutesByProject.entries())
      .map(([id, value]) => ({ id, name: projects.get(id)?.name ?? "Unknown", minutes: value }))
      .filter((row) => row.minutes > 0)
      .sort((a, b) => b.minutes - a.minutes),
    workload: Array.from(workload.values()).sort((a, b) => b.open - a.open),
    activity,
  };
}
