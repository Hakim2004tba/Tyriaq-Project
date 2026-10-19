import { eq } from "drizzle-orm";
import { getPgDb } from "@/lib/db/pg";
import { projects as projectsTable, projectIssues as projectIssuesTable } from "@/lib/db/schema";
import {
  TASKS,
  ACTIVITY,
  type ProjectRecord,
  type ProjectStage,
  type ProjectPriority,
  type ProjectIssueRecord,
  type TaskRecord,
  type ActivityRecord,
} from "@/lib/data/operations";
import {
  PROJECT_STAGES,
  PROJECT_PRIORITIES,
  DESIGNERS,
  COMMERCIALS,
  PRODUCTION_LEADS,
  VERNISSEURS,
  MONTAGE_LEADS,
  STAGE_BADGE,
  STAGE_COLOR,
  STAGE_PROGRESS,
  PRIORITY_BADGE,
  isProjectOverdue,
} from "@/lib/data/project-constants";

// Re-exported for server-side callers that only import from this module —
// pure client components should import these from project-constants.ts
// directly instead (see that file's header comment for why).
export {
  PROJECT_STAGES,
  PROJECT_PRIORITIES,
  DESIGNERS,
  COMMERCIALS,
  PRODUCTION_LEADS,
  VERNISSEURS,
  MONTAGE_LEADS,
  STAGE_BADGE,
  STAGE_COLOR,
  STAGE_PROGRESS,
  PRIORITY_BADGE,
  isProjectOverdue,
};

/** The single source of truth for projects — every reader below (and every other lib/data/*.ts module) goes through this. */
export async function getAllProjects(): Promise<ProjectRecord[]> {
  const rows = await getPgDb().select().from(projectsTable);
  return rows as ProjectRecord[];
}

export async function getProjectById(id: string): Promise<ProjectRecord | undefined> {
  const rows = await getPgDb().select().from(projectsTable).where(eq(projectsTable.id, id));
  return rows[0] as ProjectRecord | undefined;
}

/** All projects belonging to a given client, most recent first — for the client's own "Mes projets" workspace. */
export async function getProjectsForClient(clientId: string): Promise<ProjectRecord[]> {
  const projects = await getAllProjects();
  return projects
    .filter((p) => p.clientId === clientId)
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
}

export interface ProjectFilters {
  search?: string;
  stage?: ProjectStage | "tous";
  priority?: ProjectPriority | "toutes";
}

export async function filterProjects(filters: ProjectFilters, scope: string | null = null): Promise<ProjectRecord[]> {
  const all = await getAllProjects();
  const search = filters.search?.trim().toLowerCase();
  const pool = scope ? all.filter((p) => p.commercial === scope) : all;

  return pool
    .filter((p) => {
      if (search) {
        const haystack = `${p.ref} ${p.name} ${p.clientName}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      if (filters.stage && filters.stage !== "tous" && p.stage !== filters.stage) return false;
      if (filters.priority && filters.priority !== "toutes" && p.priority !== filters.priority) return false;
      return true;
    })
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
}

export interface ProjectListStats {
  total: number;
  active: number;
  delayed: number;
  urgent: number;
  totalValue: number;
}

export async function getProjectListStats(scope: string | null = null): Promise<ProjectListStats> {
  const all = await getAllProjects();
  const pool = scope ? all.filter((p) => p.commercial === scope) : all;
  const now = Date.now();

  return {
    total: pool.length,
    active: pool.filter((p) => p.stage !== "Terminé").length,
    delayed: pool.filter((p) => p.stage !== "Terminé" && new Date(p.dueDate).getTime() < now).length,
    urgent: pool.filter((p) => p.stage !== "Terminé" && p.priority === "Urgente").length,
    totalValue: pool.reduce((sum, p) => sum + p.amount, 0),
  };
}

export async function nextProjectRef(): Promise<string> {
  const all = await getAllProjects();
  const year = new Date().getFullYear();
  const numbers = all.map((p) => Number(p.ref.split("-").pop())).filter((n) => !Number.isNaN(n));
  const next = (numbers.length > 0 ? Math.max(...numbers) : 0) + 1;
  return `PROJ-${year}-${String(next).padStart(3, "0")}`;
}

// --- Sub-resources: tasks, issues, activity -----------------------------------

export function getTasksForProject(ref: string): TaskRecord[] {
  return TASKS.filter((t) => t.relatedRef === ref).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
}

export async function getIssuesForProject(ref: string): Promise<ProjectIssueRecord[]> {
  const rows = await getPgDb().select().from(projectIssuesTable).where(eq(projectIssuesTable.projectRef, ref));
  return (rows as ProjectIssueRecord[]).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getOpenIssuesCount(ref: string): Promise<number> {
  const issues = await getIssuesForProject(ref);
  return issues.filter((i) => i.status !== "Résolu").length;
}

/** Activity entries for this project's client that mention the project, or are generically about them. */
export function getActivityForProject(project: Pick<ProjectRecord, "ref" | "clientName">): ActivityRecord[] {
  return ACTIVITY.filter(
    (a) => a.category === "projet" && (a.message.includes(project.ref) || a.clientName === project.clientName),
  ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
