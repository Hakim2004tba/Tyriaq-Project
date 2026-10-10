import { getPgDb } from "@/lib/db/pg";
import { devis as devisTable } from "@/lib/db/schema";
import {
  EMPLOYEE_PROFILES,
  AVAILABILITY_STATUSES,
  AVAILABILITY_BADGE,
  PROJECTS,
  TASKS,
  ACTIVITY,
  type DevisRecord,
  PRODUCTION_ORDERS,
  VERNISSAGE_JOBS,
  MONTAGE_JOBS,
  DESIGN_VERSIONS,
  QUALITY_CONTROLS,
  VERNISSAGE_QUALITY_CONTROLS,
  type EmployeeProfileRecord,
  type ProjectRecord,
  type TaskRecord,
  type ActivityRecord,
} from "@/lib/data/operations";
import { ROLE_LABELS, type Role } from "@/lib/auth/roles";

export { AVAILABILITY_STATUSES, AVAILABILITY_BADGE };

const DEFAULT_PROFILE: Omit<EmployeeProfileRecord, "email"> = {
  phone: "",
  department: "",
  hireDate: "",
  bio: "",
  availability: "Disponible",
  availabilityNote: "",
};

/** The HR profile for a staff member, falling back to sensible defaults for an employee without a seeded entry. */
export function getEmployeeProfile(email: string): EmployeeProfileRecord {
  const found = EMPLOYEE_PROFILES.find((p) => p.email.toLowerCase() === email.toLowerCase());
  return found ?? { email, ...DEFAULT_PROFILE };
}

/** Every project where this person appears in any lead role — commercial, designer, production, vernisseur or montage. */
export function getAssignedProjectsForEmployee(name: string): ProjectRecord[] {
  return PROJECTS.filter(
    (p) => p.commercial === name || p.designer === name || p.productionLead === name || p.vernisseur === name || p.montageLead === name,
  ).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
}

/**
 * Tasks aren't assigned to a specific person anywhere in this app — only to
 * a role-queue (`TaskRecord.role`, e.g. "Commercial") — so this returns the
 * shared queue for this employee's role, not a per-person assignment.
 */
export function getTasksForEmployeeRole(role: Role): TaskRecord[] {
  const roleLabel = ROLE_LABELS[role];
  return TASKS.filter((t) => t.role === roleLabel).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
}

export function getActivityForEmployee(name: string, limit = 20): ActivityRecord[] {
  return ACTIVITY.filter((a) => a.actor === name)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

export interface PerformanceStat {
  label: string;
  value: string;
  helperText?: string;
}

/** A handful of role-aware stats computed from the data this person actually appears in — no separate performance-tracking system exists. */
export async function getEmployeePerformance(role: Role, name: string): Promise<PerformanceStat[]> {
  switch (role) {
    case "commercial": {
      const allDevis = (await getPgDb().select().from(devisTable)) as DevisRecord[];
      const myDevis = allDevis.filter((d) => d.commercial === name);
      const accepted = myDevis.filter((d) => d.status === "Accepté");
      const decided = myDevis.filter((d) => d.status === "Accepté" || d.status === "Refusé");
      const rate = decided.length > 0 ? Math.round((accepted.length / decided.length) * 100) : 0;
      const myClients = new Set(PROJECTS.filter((p) => p.commercial === name).map((p) => p.clientId)).size;
      return [
        { label: "Devis acceptés", value: String(accepted.length), helperText: `sur ${myDevis.length} émis` },
        { label: "Taux d'acceptation", value: `${rate}%` },
        { label: "Clients actifs", value: String(myClients) },
      ];
    }
    case "designer": {
      const versions = DESIGN_VERSIONS.filter((v) => v.createdBy === name);
      const validated = PROJECTS.filter((p) => p.designer === name && p.designStatus === "Validé").length;
      return [
        { label: "Versions produites", value: String(versions.length) },
        { label: "Designs validés", value: String(validated) },
        { label: "Projets assignés", value: String(PROJECTS.filter((p) => p.designer === name).length) },
      ];
    }
    case "production": {
      const orders = PRODUCTION_ORDERS.filter((o) => o.assignedWorkers.includes(name));
      const done = orders.filter((o) => o.stage === "Prêt pour vernissage").length;
      const rework = QUALITY_CONTROLS.filter((q) => q.checkedBy === name && q.result === "Non conforme").length;
      return [
        { label: "Ordres assignés", value: String(orders.length) },
        { label: "Prêts pour vernissage", value: String(done) },
        { label: "Reprises constatées", value: String(rework) },
      ];
    }
    case "vernisseur": {
      const jobs = VERNISSAGE_JOBS.filter((j) => j.assignedVernisseurs.includes(name));
      const done = jobs.filter((j) => j.stage === "Terminé").length;
      const rework = VERNISSAGE_QUALITY_CONTROLS.filter((q) => q.checkedBy === name && q.result === "Non conforme").length;
      return [
        { label: "Jobs assignés", value: String(jobs.length) },
        { label: "Terminés", value: String(done) },
        { label: "Reprises constatées", value: String(rework) },
      ];
    }
    case "montage": {
      const jobs = MONTAGE_JOBS.filter((j) => j.assignedTeam.includes(name));
      const done = jobs.filter((j) => j.stage === "Terminé").length;
      const signed = jobs.filter((j) => j.signedAt !== null).length;
      return [
        { label: "Installations assignées", value: String(jobs.length) },
        { label: "Terminées", value: String(done) },
        { label: "Réceptions signées", value: String(signed) },
      ];
    }
    default: {
      const activeProjects = PROJECTS.filter((p) => p.stage !== "Terminé").length;
      return [
        { label: "Projets actifs (entreprise)", value: String(activeProjects) },
        { label: "Projets au total", value: String(PROJECTS.length) },
      ];
    }
  }
}
