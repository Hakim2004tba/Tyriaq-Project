/**
 * The domain types the UI renders.
 *
 * Deliberately shaped for the components rather than mirroring the table
 * columns: rows arrive snake_case with nested joins, and letting that
 * shape leak into JSX means every component knows about the query that
 * fed it. Mapping happens once, at the data layer boundary.
 */

export type WorkspaceRole = "owner" | "admin" | "member";
export type ProjectStatus = "on_track" | "at_risk" | "off_track" | "on_hold" | "completed";
export type ProjectRole = "lead" | "member" | "viewer";
export type SpaceColor = "violet" | "blue" | "emerald" | "amber" | "rose" | "cyan";

export interface Member {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  role: WorkspaceRole;
}

export interface Space {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: SpaceColor;
  archived: boolean;
  position: number;
  projectCount: number;
}

export interface Project {
  id: string;
  spaceId: string;
  workspaceId: string;
  name: string;
  slug: string;
  description: string;
  status: ProjectStatus;
  color: SpaceColor;
  /** ISO date strings, or null when the project has no bound. */
  startDate: string | null;
  dueDate: string | null;
  archived: boolean;
  updatedAt: string;
  members: (Member & { role: ProjectRole })[];
  lead: Member | null;
  /** Top-level tasks in this project, and how many are done. Progress
   * everywhere is derived from these two numbers. */
  taskCount: number;
  doneCount: number;
  /** Space name and colour, for surfaces that show a project out of context. */
  spaceName: string;
  spaceSlug: string;
  spaceColor: SpaceColor;
}

export const PROJECT_STATUS_META: Record<
  ProjectStatus,
  { label: string; badge: "success" | "warning" | "danger" | "neutral" | "primary"; dot: string }
> = {
  on_track: { label: "On track", badge: "success", dot: "bg-success" },
  at_risk: { label: "At risk", badge: "warning", dot: "bg-warning" },
  off_track: { label: "Off track", badge: "danger", dot: "bg-danger" },
  on_hold: { label: "On hold", badge: "neutral", dot: "bg-text-muted" },
  completed: { label: "Completed", badge: "primary", dot: "bg-primary" },
};

export const PROJECT_STATUS_ORDER: ProjectStatus[] = [
  "on_track",
  "at_risk",
  "off_track",
  "on_hold",
  "completed",
];

/**
 * Progress, until tasks exist.
 *
 * A percentage has to come from somewhere real. With no tasks in the
 * schema yet the only honest source is the status the team set by hand,
 * so this maps status to a coarse figure and the UI labels it as such —
 * rather than inventing a number that looks computed and is not.
 */
export const STATUS_PROGRESS: Record<ProjectStatus, number> = {
  on_track: 60,
  at_risk: 45,
  off_track: 25,
  on_hold: 15,
  completed: 100,
};

/**
 * Share of a project's tasks that are done.
 *
 * Counted, not inferred. Status is a judgement somebody typed in — a
 * project can be "on track" at 10% and off track at 90% — so deriving a
 * percentage from it produced numbers that contradicted the task list
 * sitting directly underneath them.
 *
 * A project with no tasks is 0%, not "60% because it says on track".
 * `STATUS_PROGRESS` survives only for the status chip's own colouring.
 */
export function progressOf(project: Pick<Project, "taskCount" | "doneCount">): number {
  if (project.taskCount === 0) return 0;
  return Math.round((project.doneCount / project.taskCount) * 100);
}

/** "My Website!" → "my-website" */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

/** "2026-10-04" → "Sat 4 Oct". Dates are plain calendar dates, so they are
 * formatted from the string rather than parsed into a zoned Date. */
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export function formatDate(iso: string | null): string {
  if (!iso) return "No date";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "No date";
  const date = new Date(Date.UTC(y, m - 1, d));
  return `${DAYS[date.getUTCDay()]} ${d} ${MONTHS[m - 1]}`;
}

export function isOverdue(project: Pick<Project, "dueDate" | "status">): boolean {
  if (!project.dueDate || project.status === "completed") return false;
  return project.dueDate < new Date().toISOString().slice(0, 10);
}
