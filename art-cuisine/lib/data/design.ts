import {
  DESIGN_VERSIONS,
  DESIGN_STATUSES,
  DESIGN_VERSION_KINDS,
  PROJECTS,
  type DesignVersionRecord,
  type DesignStatus,
  type ProjectRecord,
} from "@/lib/data/operations";
import { CABINET_FINISHES, WORKTOP_FINISHES } from "@/lib/design/kitchen-svg";

export { DESIGN_STATUSES, DESIGN_VERSION_KINDS, CABINET_FINISHES, WORKTOP_FINISHES };

export const DESIGN_STATUS_BADGE: Record<DesignStatus, "neutral" | "info" | "warning" | "gold" | "success" | "danger"> = {
  Brouillon: "neutral",
  "Envoyé au client": "info",
  "Modification demandée": "gold",
  Validé: "success",
};

export function getDesignVersionsForProject(ref: string): DesignVersionRecord[] {
  return DESIGN_VERSIONS.filter((v) => v.projectRef === ref).sort((a, b) => b.version - a.version);
}

export function getLatestDesignVersion(ref: string): DesignVersionRecord | undefined {
  return getDesignVersionsForProject(ref)[0];
}

export function getDesignVersionById(id: string): DesignVersionRecord | undefined {
  return DESIGN_VERSIONS.find((v) => v.id === id);
}

/** Projects the design department still owes work on — anything not yet validated. */
export function getProjectsAwaitingDesign(scope: string | null = null): ProjectRecord[] {
  const pool = scope ? PROJECTS.filter((p) => p.commercial === scope) : PROJECTS;
  return pool
    .filter((p) => p.designStatus !== "Validé" && p.stage !== "Terminé")
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
}

export interface DesignListStats {
  total: number;
  awaitingClient: number;
  needsRevision: number;
  validated: number;
}

export function getDesignListStats(scope: string | null = null): DesignListStats {
  const pool = scope ? PROJECTS.filter((p) => p.commercial === scope) : PROJECTS;
  const active = pool.filter((p) => p.stage !== "Terminé");

  return {
    total: active.length,
    awaitingClient: active.filter((p) => p.designStatus === "Envoyé au client").length,
    needsRevision: active.filter((p) => p.designStatus === "Modification demandée").length,
    validated: active.filter((p) => p.designStatus === "Validé").length,
  };
}

export function isDesignAwaitingClient(status: DesignStatus): boolean {
  return status === "Envoyé au client";
}
