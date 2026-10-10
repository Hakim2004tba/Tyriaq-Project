import {
  PROJECTS,
  PROJECT_STAGES,
  PROJECT_PRIORITIES,
  PROJECT_ISSUES,
  TASKS,
  ACTIVITY,
  type ProjectRecord,
  type ProjectStage,
  type ProjectPriority,
  type ProjectIssueRecord,
  type TaskRecord,
  type ActivityRecord,
} from "@/lib/data/operations";
import { DESIGNERS } from "@/lib/data/appointments";

export { PROJECT_STAGES, PROJECT_PRIORITIES, DESIGNERS };

/** The commercials who can own a project — same roster used across Clients, Leads and Devis. */
export const COMMERCIALS = ["Sofia Lahlou", "Yacine Khelifi"] as const;

/** Production, vernissage and montage leads — kept distinct from the demo login accounts, same reasoning as DESIGNERS. */
export const PRODUCTION_LEADS = ["Karim Meziane", "Yanis Cherfaoui"] as const;
export const VERNISSEURS = ["Farid Amrani", "Sami Bouzid"] as const;
export const MONTAGE_LEADS = ["Walid Kaci", "Sofiane Meddah"] as const;

export const STAGE_BADGE: Record<ProjectStage, "neutral" | "warning" | "gold" | "info" | "success" | "danger"> = {
  Conception: "neutral",
  "Validation client": "info",
  Production: "warning",
  Vernissage: "gold",
  "Contrôle qualité": "info",
  Montage: "warning",
  Réception: "gold",
  Terminé: "success",
};

export const STAGE_COLOR: Record<ProjectStage, string> = {
  Conception: "bg-stone-400",
  "Validation client": "bg-[var(--status-info-fg)]",
  Production: "bg-[var(--status-warning-fg)]",
  Vernissage: "bg-accent",
  "Contrôle qualité": "bg-[var(--status-info-fg)]",
  Montage: "bg-ink-800",
  Réception: "bg-accent",
  Terminé: "bg-[var(--status-success-fg)]",
};

/** The default progress (%) a project jumps to when it enters a stage, absent manual fine-tuning. */
export const STAGE_PROGRESS: Record<ProjectStage, number> = {
  Conception: 10,
  "Validation client": 20,
  Production: 40,
  Vernissage: 60,
  "Contrôle qualité": 75,
  Montage: 90,
  Réception: 97,
  Terminé: 100,
};

export const PRIORITY_BADGE: Record<ProjectPriority, "neutral" | "info" | "warning" | "danger"> = {
  Basse: "neutral",
  Normale: "info",
  Haute: "warning",
  Urgente: "danger",
};

export function getProjectById(id: string): ProjectRecord | undefined {
  return PROJECTS.find((p) => p.id === id);
}

/** All projects belonging to a given client, most recent first — for the client's own "Mes projets" workspace. */
export function getProjectsForClient(clientId: string): ProjectRecord[] {
  return PROJECTS.filter((p) => p.clientId === clientId).sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
  );
}

export interface ProjectFilters {
  search?: string;
  stage?: ProjectStage | "tous";
  priority?: ProjectPriority | "toutes";
}

export function filterProjects(filters: ProjectFilters, scope: string | null = null): ProjectRecord[] {
  const search = filters.search?.trim().toLowerCase();
  const pool = scope ? PROJECTS.filter((p) => p.commercial === scope) : PROJECTS;

  return pool.filter((p) => {
    if (search) {
      const haystack = `${p.ref} ${p.name} ${p.clientName}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    if (filters.stage && filters.stage !== "tous" && p.stage !== filters.stage) return false;
    if (filters.priority && filters.priority !== "toutes" && p.priority !== filters.priority) return false;
    return true;
  }).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
}

export interface ProjectListStats {
  total: number;
  active: number;
  delayed: number;
  urgent: number;
  totalValue: number;
}

export function getProjectListStats(scope: string | null = null): ProjectListStats {
  const pool = scope ? PROJECTS.filter((p) => p.commercial === scope) : PROJECTS;
  const now = Date.now();

  return {
    total: pool.length,
    active: pool.filter((p) => p.stage !== "Terminé").length,
    delayed: pool.filter((p) => p.stage !== "Terminé" && new Date(p.dueDate).getTime() < now).length,
    urgent: pool.filter((p) => p.stage !== "Terminé" && p.priority === "Urgente").length,
    totalValue: pool.reduce((sum, p) => sum + p.amount, 0),
  };
}

export function nextProjectRef(): string {
  const year = new Date().getFullYear();
  const numbers = PROJECTS.map((p) => Number(p.ref.split("-").pop())).filter((n) => !Number.isNaN(n));
  const next = (numbers.length > 0 ? Math.max(...numbers) : 0) + 1;
  return `PROJ-${year}-${String(next).padStart(3, "0")}`;
}

export function isProjectOverdue(project: Pick<ProjectRecord, "stage" | "dueDate">): boolean {
  return project.stage !== "Terminé" && new Date(project.dueDate).getTime() < Date.now();
}

// --- Sub-resources: tasks, issues, activity -----------------------------------

export function getTasksForProject(ref: string): TaskRecord[] {
  return TASKS.filter((t) => t.relatedRef === ref).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
}

export function getIssuesForProject(ref: string): ProjectIssueRecord[] {
  return PROJECT_ISSUES.filter((i) => i.projectRef === ref).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function getOpenIssuesCount(ref: string): number {
  return PROJECT_ISSUES.filter((i) => i.projectRef === ref && i.status !== "Résolu").length;
}

/** Activity entries for this project's client that mention the project, or are generically about them. */
export function getActivityForProject(project: Pick<ProjectRecord, "ref" | "clientName">): ActivityRecord[] {
  return ACTIVITY.filter(
    (a) => a.category === "projet" && (a.message.includes(project.ref) || a.clientName === project.clientName),
  ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
