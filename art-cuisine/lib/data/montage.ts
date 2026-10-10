import {
  MONTAGE_JOBS,
  MONTAGE_MISSING_PIECES,
  MONTAGE_CHECKLIST_ITEMS,
  MONTAGE_PHOTOS,
  MONTAGE_STAGES,
  MONTAGE_STAGE_PROGRESS,
  MONTAGE_TEAM,
  MONTAGE_VEHICLES,
  MISSING_PIECE_STATUSES,
  MONTAGE_PHOTO_PHASES,
  ACTIVITY,
  PROJECTS,
  PROJECT_STAGES,
  type MontageJobRecord,
  type MontageStage,
  type MontageMissingPieceRecord,
  type MontageChecklistItemRecord,
  type MontagePhotoRecord,
  type ActivityRecord,
} from "@/lib/data/operations";

export { MONTAGE_STAGES, MONTAGE_STAGE_PROGRESS, MONTAGE_TEAM, MONTAGE_VEHICLES, MISSING_PIECE_STATUSES, MONTAGE_PHOTO_PHASES };

export const MONTAGE_STAGE_BADGE: Record<MontageStage, "neutral" | "info" | "warning" | "gold" | "success" | "danger"> = {
  Planifié: "neutral",
  "En route": "info",
  Arrivé: "info",
  Installation: "warning",
  "Ajustements finaux": "warning",
  Nettoyage: "gold",
  "Réception client": "gold",
  Terminé: "success",
};

/** The job's displayed status label — "Annulée" overrides the underlying stage, which is left untouched for the record. */
export function getMontageStatusLabel(job: Pick<MontageJobRecord, "stage" | "cancelled">): string {
  return job.cancelled ? "Annulée" : job.stage;
}

export function getMontageStatusBadge(job: Pick<MontageJobRecord, "stage" | "cancelled">): "neutral" | "info" | "warning" | "gold" | "success" | "danger" {
  return job.cancelled ? "danger" : MONTAGE_STAGE_BADGE[job.stage];
}

export interface ProjectOption {
  id: string;
  ref: string;
  label: string;
}

/** Projects whose vernissage (or later) has been reached — eligible for a new montage job. */
export function getEligibleProjectOptions(): ProjectOption[] {
  const montageIndex = PROJECT_STAGES.indexOf("Montage");
  return PROJECTS.filter((p) => PROJECT_STAGES.indexOf(p.stage) >= montageIndex)
    .map((p) => ({ id: p.id, ref: p.ref, label: `${p.ref} — ${p.name} (${p.clientName})` }))
    .sort((a, b) => a.ref.localeCompare(b.ref));
}

export function getMontageJobById(id: string): MontageJobRecord | undefined {
  return MONTAGE_JOBS.find((j) => j.id === id);
}

export function getMontageJobsForProject(projectRef: string): MontageJobRecord[] {
  return MONTAGE_JOBS.filter((j) => j.projectRef === projectRef).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function getMissingPiecesForJob(jobId: string): MontageMissingPieceRecord[] {
  return MONTAGE_MISSING_PIECES.filter((p) => p.jobId === jobId).sort(
    (a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime(),
  );
}

export function getChecklistForJob(jobId: string): MontageChecklistItemRecord[] {
  return MONTAGE_CHECKLIST_ITEMS.filter((c) => c.jobId === jobId);
}

export function getPhotosForJob(jobId: string): MontagePhotoRecord[] {
  return MONTAGE_PHOTOS.filter((p) => p.jobId === jobId).sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
  );
}

/** Vernissage-category activity entries mentioning this job's ref — its history log. */
export function getActivityForJob(jobRef: string): ActivityRecord[] {
  return ACTIVITY.filter((a) => a.category === "montage" && a.message.includes(jobRef)).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

/** The montage-assignment scope: null (sees everything) unless the user is a montage agent, who only sees jobs they're assigned to. */
export function getMontageScope(user: { role: string; name: string }): string | null {
  return user.role === "montage" ? user.name : null;
}

export function canAccessMontageJob(scope: string | null, job: Pick<MontageJobRecord, "assignedTeam">): boolean {
  return !scope || job.assignedTeam.includes(scope);
}

export interface MontageFilters {
  search?: string;
  stage?: MontageStage | "toutes";
}

export function filterMontageJobs(filters: MontageFilters, scope: string | null): MontageJobRecord[] {
  const search = filters.search?.trim().toLowerCase();

  return MONTAGE_JOBS.filter((j) => {
    if (!canAccessMontageJob(scope, j)) return false;
    if (search) {
      const haystack = `${j.ref} ${j.projectRef} ${j.clientName}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    if (filters.stage && filters.stage !== "toutes" && j.stage !== filters.stage) return false;
    return true;
  }).sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
}

export interface MontageListStats {
  total: number;
  inProgress: number;
  today: number;
  done: number;
  cancelled: number;
}

export function getMontageListStats(scope: string | null): MontageListStats {
  const pool = MONTAGE_JOBS.filter((j) => canAccessMontageJob(scope, j));
  const now = new Date();

  return {
    total: pool.length,
    inProgress: pool.filter((j) => !j.cancelled && j.stage !== "Terminé").length,
    today: pool.filter((j) => !j.cancelled && j.stage !== "Terminé" && isSameDay(new Date(j.scheduledDate), now)).length,
    done: pool.filter((j) => j.stage === "Terminé").length,
    cancelled: pool.filter((j) => j.cancelled).length,
  };
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Active jobs grouped by scheduled day, soonest first — the installation calendar. */
export function getInstallationCalendar(scope: string | null): { day: string; jobs: MontageJobRecord[] }[] {
  const pool = MONTAGE_JOBS.filter((j) => canAccessMontageJob(scope, j) && !j.cancelled && j.stage !== "Terminé");
  const groups = new Map<string, MontageJobRecord[]>();
  for (const job of pool) {
    const day = job.scheduledDate.slice(0, 10);
    if (!groups.has(day)) groups.set(day, []);
    groups.get(day)!.push(job);
  }
  return Array.from(groups.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, jobs]) => ({ day, jobs }));
}

export function nextMontageJobRef(): string {
  const year = new Date().getFullYear();
  const numbers = MONTAGE_JOBS.map((j) => Number(j.ref.split("-").pop())).filter((n) => !Number.isNaN(n));
  const next = (numbers.length > 0 ? Math.max(...numbers) : 0) + 1;
  return `MO-${year}-${String(next).padStart(3, "0")}`;
}

export function mapsUrlForAddress(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
