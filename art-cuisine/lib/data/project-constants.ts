/**
 * Pure, DB-import-free project constants/labels — split out of
 * project-records.ts so client components can import PROJECT_STAGES,
 * COMMERCIALS, etc. without dragging the `pg` driver into the browser
 * bundle (Turbopack doesn't tree-shake per-export, so any client import
 * from a module that also imports a Node-only dependency pulls the whole
 * dependency graph in).
 */
import { PROJECT_STAGES, PROJECT_PRIORITIES, DESIGNERS, type ProjectStage, type ProjectPriority } from "@/lib/data/operations";

export { PROJECT_STAGES, PROJECT_PRIORITIES, DESIGNERS };

export const COMMERCIALS = ["Sofia Lahlou", "Yacine Khelifi"] as const;
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

export function isProjectOverdue(project: { stage: ProjectStage; dueDate: string }): boolean {
  return project.stage !== "Terminé" && new Date(project.dueDate).getTime() < Date.now();
}
