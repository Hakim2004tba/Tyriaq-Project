import {
  VERNISSAGE_JOBS,
  VERNISSAGE_PIECES,
  VERNISSAGE_CHECKLIST_ITEMS,
  VERNISSAGE_QUALITY_CONTROLS,
  VERNISSAGE_STAGES,
  VERNISSAGE_STAGE_PROGRESS,
  VERNISSAGE_TEAM,
  VERNISSAGE_FINISHES,
  PIECE_STATUSES,
  ACTIVITY,
  PROJECTS,
  PROJECT_STAGES,
  type VernissageJobRecord,
  type VernissageStage,
  type VernissagePieceRecord,
  type VernissageChecklistItemRecord,
  type VernissageQualityControlRecord,
  type ActivityRecord,
} from "@/lib/data/operations";
import { CABINET_FINISHES } from "@/lib/design/kitchen-svg";

export { VERNISSAGE_STAGES, VERNISSAGE_STAGE_PROGRESS, VERNISSAGE_TEAM, VERNISSAGE_FINISHES, PIECE_STATUSES, CABINET_FINISHES };

export const VERNISSAGE_STAGE_BADGE: Record<VernissageStage, "neutral" | "info" | "warning" | "gold" | "success" | "danger"> = {
  "À vernir": "neutral",
  Préparation: "info",
  Ponçage: "info",
  Apprêt: "warning",
  Vernissage: "warning",
  Séchage: "gold",
  "Contrôle qualité": "gold",
  Terminé: "success",
};

export interface ProjectOption {
  id: string;
  ref: string;
  label: string;
}

/** Projects whose production has reached (or passed) Vernissage — eligible for a new vernissage job. */
export function getEligibleProjectOptions(): ProjectOption[] {
  const vernissageIndex = PROJECT_STAGES.indexOf("Vernissage");
  return PROJECTS.filter((p) => PROJECT_STAGES.indexOf(p.stage) >= vernissageIndex)
    .map((p) => ({ id: p.id, ref: p.ref, label: `${p.ref} — ${p.name} (${p.clientName})` }))
    .sort((a, b) => a.ref.localeCompare(b.ref));
}

export function getVernissageJobById(id: string): VernissageJobRecord | undefined {
  return VERNISSAGE_JOBS.find((j) => j.id === id);
}

export function getVernissageJobsForProject(projectRef: string): VernissageJobRecord[] {
  return VERNISSAGE_JOBS.filter((j) => j.projectRef === projectRef).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function getPiecesForJob(jobId: string): VernissagePieceRecord[] {
  return VERNISSAGE_PIECES.filter((p) => p.jobId === jobId);
}

export function getChecklistForJob(jobId: string): VernissageChecklistItemRecord[] {
  return VERNISSAGE_CHECKLIST_ITEMS.filter((c) => c.jobId === jobId);
}

export function getQualityControlsForJob(jobId: string): VernissageQualityControlRecord[] {
  return VERNISSAGE_QUALITY_CONTROLS.filter((q) => q.jobId === jobId).sort(
    (a, b) => new Date(b.checkedAt).getTime() - new Date(a.checkedAt).getTime(),
  );
}

export function getReworkCount(jobId: string): number {
  return VERNISSAGE_QUALITY_CONTROLS.filter((q) => q.jobId === jobId && q.result === "Non conforme").length;
}

/** Vernissage-category activity entries mentioning this job's ref — its history log. */
export function getActivityForJob(jobRef: string): ActivityRecord[] {
  return ACTIVITY.filter((a) => a.category === "vernissage" && a.message.includes(jobRef)).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

/** The vernisseur-assignment scope: null (sees everything) unless the user is a vernisseur, who only sees jobs they're assigned to. */
export function getVernisseurScope(user: { role: string; name: string }): string | null {
  return user.role === "vernisseur" ? user.name : null;
}

export function canAccessVernissageJob(scope: string | null, job: Pick<VernissageJobRecord, "assignedVernisseurs">): boolean {
  return !scope || job.assignedVernisseurs.includes(scope);
}

export interface VernissageFilters {
  search?: string;
  stage?: VernissageStage | "toutes";
}

export function filterVernissageJobs(filters: VernissageFilters, scope: string | null): VernissageJobRecord[] {
  const search = filters.search?.trim().toLowerCase();

  return VERNISSAGE_JOBS.filter((j) => {
    if (!canAccessVernissageJob(scope, j)) return false;
    if (search) {
      const haystack = `${j.ref} ${j.projectRef} ${j.clientName}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    if (filters.stage && filters.stage !== "toutes" && j.stage !== filters.stage) return false;
    return true;
  }).sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
}

export interface VernissageListStats {
  total: number;
  inProgress: number;
  inQualityControl: number;
  done: number;
  overdue: number;
}

export function getVernissageListStats(scope: string | null): VernissageListStats {
  const pool = VERNISSAGE_JOBS.filter((j) => canAccessVernissageJob(scope, j));
  const now = Date.now();

  return {
    total: pool.length,
    inProgress: pool.filter((j) => j.stage !== "Terminé").length,
    inQualityControl: pool.filter((j) => j.stage === "Contrôle qualité").length,
    done: pool.filter((j) => j.stage === "Terminé").length,
    overdue: pool.filter((j) => j.stage !== "Terminé" && new Date(j.deadline).getTime() < now).length,
  };
}

export function isVernissageJobOverdue(job: Pick<VernissageJobRecord, "stage" | "deadline">): boolean {
  return job.stage !== "Terminé" && new Date(job.deadline).getTime() < Date.now();
}

export function nextVernissageJobRef(): string {
  const year = new Date().getFullYear();
  const numbers = VERNISSAGE_JOBS.map((j) => Number(j.ref.split("-").pop())).filter((n) => !Number.isNaN(n));
  const next = (numbers.length > 0 ? Math.max(...numbers) : 0) + 1;
  return `VJ-${year}-${String(next).padStart(3, "0")}`;
}
