/**
 * Demo operational dataset for the admin dashboard. Dates are generated
 * relative to "now" (rather than hardcoded) so the dashboard always reads
 * as current, regardless of when it's viewed. This stands in for the real
 * CRM/ERP data that the Clients, Leads, Devis and Projets modules will
 * eventually read and write.
 */

import type { KitchenVisualParams } from "@/lib/design/kitchen-svg";

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

export type PeriodKey = "7j" | "30j" | "90j" | "annee" | "tout";

export const PERIOD_OPTIONS: { value: PeriodKey; label: string }[] = [
  { value: "7j", label: "7 derniers jours" },
  { value: "30j", label: "30 derniers jours" },
  { value: "90j", label: "90 derniers jours" },
  { value: "annee", label: "Cette année" },
  { value: "tout", label: "Depuis le début" },
];

export const LEAD_STATUSES = [
  "Nouveau",
  "Contacté",
  "Qualification",
  "Rendez-vous",
  "Devis",
  "Négociation",
  "Gagné",
  "Perdu",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_SOURCES = [
  "Site web",
  "Instagram",
  "Facebook",
  "WhatsApp",
  "Showroom",
  "Recommandation",
  "Téléphone",
] as const;

export type LeadSource = (typeof LEAD_SOURCES)[number];

export const PROJECT_TYPES = [
  "Cuisine en L",
  "Cuisine en U",
  "Cuisine en I",
  "Cuisine parallèle",
  "Cuisine avec îlot",
] as const;

export type ProjectType = (typeof PROJECT_TYPES)[number];

export const BUDGET_RANGES = [
  { value: "0-800000", label: "Moins de 800 000 DA", min: 0, max: 800_000 },
  { value: "800000-1500000", label: "800 000 — 1 500 000 DA", min: 800_000, max: 1_500_000 },
  { value: "1500000-2500000", label: "1 500 000 — 2 500 000 DA", min: 1_500_000, max: 2_500_000 },
  { value: "2500000-99999999", label: "Plus de 2 500 000 DA", min: 2_500_000, max: Infinity },
] as const;

export function isFollowUpOverdue(nextFollowUpAt: string | null): boolean {
  if (!nextFollowUpAt) return false;
  return new Date(nextFollowUpAt).getTime() < Date.now();
}

export interface LeadRecord {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  source: LeadSource;
  status: LeadStatus;
  commercial: string;
  projectType: ProjectType;
  budget: number;
  nextFollowUpAt: string | null;
  createdAt: string;
}

// LEADS moved to Postgres — see lib/data/leads.ts

export type LeadInteractionType = "note" | "call" | "appointment" | "task" | "reminder";

export interface LeadInteractionRecord {
  id: string;
  leadId: string;
  type: LeadInteractionType;
  title: string;
  content: string;
  dueDate: string | null;
  completed: boolean;
  outcome: string | null;
  createdBy: string;
  createdAt: string;
}

// LEAD_INTERACTIONS moved to Postgres — see lib/data/leads.ts

/**
 * The commercials/designers who can be assigned as an owner across leads,
 * clients, devis and appointments. Duplicated as local consts in those
 * entity modules too (lib/data/{clients,devis,leads,appointments}.ts) for
 * server-side use — kept here as the client-safe copy, since those modules
 * now import the Postgres driver and can't be imported from "use client"
 * components without pulling `pg` into the browser bundle.
 */
export const COMMERCIALS = ["Sofia Lahlou", "Yacine Khelifi"] as const;
export const DESIGNERS = ["Mehdi Cherfaoui", "Amina Rahal"] as const;

export type ClientStatus = "Actif" | "VIP" | "Inactif" | "Archivé";
export const CLIENT_STATUSES = ["Actif", "VIP", "Inactif", "Archivé"] as const satisfies readonly ClientStatus[];

export interface ClientRecord {
  id: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  commercial: string;
  status: ClientStatus;
  since: string;
}

// CLIENTS moved to Postgres — see lib/data/clients.ts

export const DEVIS_STATUSES = ["Brouillon", "Envoyé", "Vu", "Accepté", "Refusé", "Modification demandée"] as const;
export type DevisStatus = (typeof DEVIS_STATUSES)[number];

export type DiscountType = "Pourcentage" | "Montant fixe";

export interface DevisRecord {
  id: string;
  ref: string;
  clientName: string;
  projectLabel: string;
  amount: number;
  status: DevisStatus;
  /** null when a public request (e.g. the kitchen configurator) hasn't been claimed by a commercial yet. */
  commercial: string | null;
  createdAt: string;
  validUntil: string;
  /** True FK links — resolved by name-matching below, since seed data predates them. */
  clientId: string | null;
  leadId: string | null;
  projectRef: string | null;
  /** Incremented each time a revised quote is issued; superseded snapshots live in DEVIS_VERSIONS. */
  version: number;
  /** Stable across every version of the same quote — equals the id of the first version. */
  familyId: string;
  /** The client's rejection reason or requested changes, set alongside a Refusé/Modification demandée decision. */
  clientNote: string | null;
  /** When the client last approved, refused, or requested a modification. */
  decidedAt: string | null;
  /** Pricing — see lib/data/pricing.ts. `amount` is recomputed from DEVIS_LINE_ITEMS whenever any line exists. */
  discountType: DiscountType | null;
  discountValue: number;
  taxRate: number;
  depositPercent: number;
}

// DEVIS, DEVIS_VERSIONS and DEVIS_LINE_ITEMS moved to Postgres — see lib/data/devis.ts and lib/data/pricing.ts.

export const PROJECT_STAGES = [
  "Conception",
  "Validation client",
  "Production",
  "Vernissage",
  "Contrôle qualité",
  "Montage",
  "Réception",
  "Terminé",
] as const;
export type ProjectStage = (typeof PROJECT_STAGES)[number];

export const PROJECT_PRIORITIES = ["Basse", "Normale", "Haute", "Urgente"] as const;
export type ProjectPriority = (typeof PROJECT_PRIORITIES)[number];

export const DESIGN_STATUSES = ["Brouillon", "Envoyé au client", "Modification demandée", "Validé"] as const;
export type DesignStatus = (typeof DESIGN_STATUSES)[number];

export interface DesignMeasurements {
  width: number;
  depth: number;
  height: number;
  notes: string;
}

export interface ProjectRecord {
  id: string;
  ref: string;
  /** The project's display name — typically the client's home, e.g. "Villa Benali". */
  name: string;
  clientId: string | null;
  clientName: string;
  /** The accepted devis this project was created from. */
  devisId: string | null;
  commercial: string | null;
  designer: string | null;
  productionLead: string | null;
  vernisseur: string | null;
  montageLead: string | null;
  stage: ProjectStage;
  priority: ProjectPriority;
  amount: number;
  progress: number;
  startDate: string;
  dueDate: string;
  completedAt: string | null;
  /** Conception — gates the move to Production: see lib/actions/projects.ts. */
  designStatus: DesignStatus;
  measurements: DesignMeasurements | null;
  designerNotes: string;
  /** The client's requested changes, set alongside a "Modification demandée" decision. */
  designClientNote: string | null;
  designValidatedAt: string | null;
  /** Catalogue items (materials/finishes) chosen for this project — see lib/actions/projects.ts updateProjectMaterials. */
  materialSelections: string[];
}

type ProjectSeed = Omit<
  ProjectRecord,
  "clientId" | "devisId" | "designer" | "productionLead" | "vernisseur" | "montageLead" | "priority" | "designStatus" | "measurements" | "designerNotes" | "designClientNote" | "designValidatedAt" | "materialSelections"
> & {
  designer?: string | null;
  productionLead?: string | null;
  vernisseur?: string | null;
  montageLead?: string | null;
  priority?: ProjectPriority;
  designStatus?: DesignStatus;
  measurements?: DesignMeasurements | null;
  designerNotes?: string;
  designClientNote?: string | null;
  designValidatedAt?: string | null;
  materialSelections?: string[];
};

const PROJECTS_SEED: ProjectSeed[] = [];

/**
 * The seed projects are enriched here — by name-matching each project's
 * client, now that Clients/Devis live in Postgres rather than a same-module
 * array, that FK resolution happens at the point of use instead (see
 * lib/data/clients.ts / lib/data/devis.ts). PROJECTS_SEED is always empty for
 * a fresh client demo, so clientId/devisId simply resolve to null here.
 */
export const PROJECTS: ProjectRecord[] = PROJECTS_SEED.map((p) => ({
  ...p,
  clientId: null,
  devisId: null,
  designer: p.designer ?? null,
  productionLead: p.productionLead ?? null,
  vernisseur: p.vernisseur ?? null,
  montageLead: p.montageLead ?? null,
  priority: p.priority ?? "Normale",
  designStatus: p.designStatus ?? (p.stage === "Conception" || p.stage === "Validation client" ? "Brouillon" : "Validé"),
  measurements: p.measurements ?? null,
  designerNotes: p.designerNotes ?? "",
  designClientNote: p.designClientNote ?? null,
  designValidatedAt: p.designValidatedAt ?? (p.stage === "Conception" || p.stage === "Validation client" ? null : p.startDate),
  materialSelections: p.materialSelections ?? [],
}));

export type ProjectIssueSeverity = "Basse" | "Normale" | "Haute" | "Critique";
export type ProjectIssueStatus = "Ouvert" | "En cours" | "Résolu";

export interface ProjectIssueRecord {
  id: string;
  projectRef: string;
  title: string;
  description: string;
  severity: ProjectIssueSeverity;
  status: ProjectIssueStatus;
  reportedBy: string;
  createdAt: string;
  resolvedAt: string | null;
}

export const PROJECT_ISSUES: ProjectIssueRecord[] = [];

// --- Conception / design versions -----------------------------------------

export const DESIGN_VERSION_KINDS = ["Plan", "Design 3D", "Rendu"] as const;
export type DesignVersionKind = (typeof DESIGN_VERSION_KINDS)[number];

export type DesignVersionSource = "upload" | "generated" | "refined";

export interface DesignVersionRecord {
  id: string;
  projectRef: string;
  version: number;
  kind: DesignVersionKind;
  imageDataUrl: string | null;
  source: DesignVersionSource;
  /** The generation parameters behind a generated/refined image — null for uploads, needed so "refine" can start from them. */
  params: KitchenVisualParams | null;
  prompt: string | null;
  note: string | null;
  createdBy: string;
  createdAt: string;
}

export const DESIGN_VERSIONS: DesignVersionRecord[] = [];

// --- Production --------------------------------------------------------------

export const PRODUCTION_STAGES = [
  "À préparer",
  "Découpe",
  "Usinage",
  "Assemblage",
  "Contrôle qualité",
  "Prêt pour vernissage",
] as const;
export type ProductionStage = (typeof PRODUCTION_STAGES)[number];

/** The progress (%) an order jumps to when it enters a stage — mirrors STAGE_PROGRESS for projects. */
export const PRODUCTION_STAGE_PROGRESS: Record<ProductionStage, number> = {
  "À préparer": 10,
  Découpe: 30,
  Usinage: 50,
  Assemblage: 70,
  "Contrôle qualité": 90,
  "Prêt pour vernissage": 100,
};

/** The workshop floor roster — includes both production leads, who can also be assigned to the bench. */
export const WORKSHOP_TEAM = ["Karim Meziane", "Yanis Cherfaoui", "Nassim Belaïd", "Hocine Ferrad", "Amine Touati", "Redouane Sahli"] as const;

export const PIECE_STATUSES = ["À faire", "En cours", "Terminée"] as const;
export type PieceStatus = (typeof PIECE_STATUSES)[number];

export interface ProductionPieceRecord {
  id: string;
  orderId: string;
  name: string;
  material: string;
  quantity: number;
  unit: string;
  status: PieceStatus;
}

export interface ProductionChecklistItemRecord {
  id: string;
  orderId: string;
  stage: ProductionStage;
  label: string;
  done: boolean;
}

export const QUALITY_CONTROL_RESULTS = ["Conforme", "Non conforme"] as const;
export type QualityControlResult = (typeof QUALITY_CONTROL_RESULTS)[number];

export interface QualityControlRecord {
  id: string;
  orderId: string;
  result: QualityControlResult;
  notes: string;
  checkedBy: string;
  checkedAt: string;
}

export interface ProductionOrderRecord {
  id: string;
  ref: string;
  projectId: string;
  projectRef: string;
  clientName: string;
  stage: ProductionStage;
  priority: ProjectPriority;
  assignedWorkers: string[];
  startDate: string;
  deadline: string;
  progress: number;
  workshopNotes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export const PRODUCTION_ORDERS: ProductionOrderRecord[] = [];

export const PRODUCTION_PIECES: ProductionPieceRecord[] = [];

const PRODUCTION_CHECKLIST_TEMPLATE: { stage: ProductionStage; label: string }[] = [
  { stage: "À préparer", label: "Plans et mesures vérifiés" },
  { stage: "À préparer", label: "Matériaux réservés en stock" },
  { stage: "Découpe", label: "Panneaux découpés aux cotes" },
  { stage: "Découpe", label: "Chants collés" },
  { stage: "Usinage", label: "Perçages et rainurages réalisés" },
  { stage: "Usinage", label: "Ferrures posées" },
  { stage: "Assemblage", label: "Caissons assemblés" },
  { stage: "Assemblage", label: "Façades et tiroirs montés" },
  { stage: "Contrôle qualité", label: "Dimensions conformes au plan" },
  { stage: "Contrôle qualité", label: "Aucun défaut visuel constaté" },
];

export const PRODUCTION_CHECKLIST_ITEMS: ProductionChecklistItemRecord[] = PRODUCTION_ORDERS.flatMap((order) => {
  const orderStageIndex = PRODUCTION_STAGES.indexOf(order.stage);
  return PRODUCTION_CHECKLIST_TEMPLATE.map((item, i) => ({
    id: `CHK-${order.id}-${i + 1}`,
    orderId: order.id,
    stage: item.stage,
    label: item.label,
    done: PRODUCTION_STAGES.indexOf(item.stage) < orderStageIndex,
  }));
});

export const QUALITY_CONTROLS: QualityControlRecord[] = [];

// --- Vernissage ----------------------------------------------------------------

export const VERNISSAGE_STAGES = [
  "À vernir",
  "Préparation",
  "Ponçage",
  "Apprêt",
  "Vernissage",
  "Séchage",
  "Contrôle qualité",
  "Terminé",
] as const;
export type VernissageStage = (typeof VERNISSAGE_STAGES)[number];

/** The progress (%) a job jumps to when it enters a stage — mirrors PRODUCTION_STAGE_PROGRESS. */
export const VERNISSAGE_STAGE_PROGRESS: Record<VernissageStage, number> = {
  "À vernir": 5,
  Préparation: 20,
  Ponçage: 35,
  Apprêt: 50,
  Vernissage: 65,
  Séchage: 80,
  "Contrôle qualité": 92,
  Terminé: 100,
};

/** The finishing-room roster — includes the two existing vernisseur leads plus the demo login account. */
export const VERNISSAGE_TEAM = ["Nadia Slimani", "Farid Amrani", "Sami Bouzid", "Ismail Grine"] as const;

export const VERNISSAGE_FINISHES = ["Mat", "Satiné", "Brillant", "Vernis naturel"] as const;
export type VernissageFinish = (typeof VERNISSAGE_FINISHES)[number];

export interface VernissagePieceRecord {
  id: string;
  jobId: string;
  name: string;
  material: string;
  quantity: number;
  unit: string;
  status: PieceStatus;
}

export interface VernissageChecklistItemRecord {
  id: string;
  jobId: string;
  stage: VernissageStage;
  label: string;
  done: boolean;
}

export interface VernissageQualityControlRecord {
  id: string;
  jobId: string;
  result: QualityControlResult;
  notes: string;
  checkedBy: string;
  checkedAt: string;
}

export interface VernissageJobRecord {
  id: string;
  ref: string;
  projectId: string;
  projectRef: string;
  clientName: string;
  stage: VernissageStage;
  priority: ProjectPriority;
  assignedVernisseurs: string[];
  /** Lacquer/stain color applied to this job — one of the CABINET_FINISHES hexes. */
  color: string;
  finish: VernissageFinish;
  deadline: string;
  progress: number;
  notes: string;
  /** Set when the final quality control passes — the "final approval" moment. */
  approvedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export const VERNISSAGE_JOBS: VernissageJobRecord[] = [];

export const VERNISSAGE_PIECES: VernissagePieceRecord[] = [];

const VERNISSAGE_CHECKLIST_TEMPLATE: { stage: VernissageStage; label: string }[] = [
  { stage: "À vernir", label: "Pièces réceptionnées depuis la production" },
  { stage: "Préparation", label: "Surfaces dépoussiérées et dégraissées" },
  { stage: "Ponçage", label: "Ponçage fin réalisé sur toutes les faces" },
  { stage: "Apprêt", label: "Couche d'apprêt appliquée" },
  { stage: "Vernissage", label: "Couche de finition appliquée" },
  { stage: "Séchage", label: "Séchage complet en cabine ventilée" },
  { stage: "Contrôle qualité", label: "Teinte conforme à l'échantillon validé" },
  { stage: "Contrôle qualité", label: "Aucune coulure ni défaut de surface" },
];

export const VERNISSAGE_CHECKLIST_ITEMS: VernissageChecklistItemRecord[] = VERNISSAGE_JOBS.flatMap((job) => {
  const jobStageIndex = VERNISSAGE_STAGES.indexOf(job.stage);
  return VERNISSAGE_CHECKLIST_TEMPLATE.map((item, i) => ({
    id: `VCHK-${job.id}-${i + 1}`,
    jobId: job.id,
    stage: item.stage,
    label: item.label,
    done: VERNISSAGE_STAGES.indexOf(item.stage) < jobStageIndex,
  }));
});

export const VERNISSAGE_QUALITY_CONTROLS: VernissageQualityControlRecord[] = [];

// --- Montage -------------------------------------------------------------------

export const MONTAGE_STAGES = [
  "Planifié",
  "En route",
  "Arrivé",
  "Installation",
  "Ajustements finaux",
  "Nettoyage",
  "Réception client",
  "Terminé",
] as const;
export type MontageStage = (typeof MONTAGE_STAGES)[number];

/** The progress (%) a job jumps to when it enters a stage — mirrors PRODUCTION/VERNISSAGE_STAGE_PROGRESS. */
export const MONTAGE_STAGE_PROGRESS: Record<MontageStage, number> = {
  Planifié: 5,
  "En route": 20,
  Arrivé: 35,
  Installation: 50,
  "Ajustements finaux": 65,
  Nettoyage: 80,
  "Réception client": 92,
  Terminé: 100,
};

/** The installation-team roster — includes the two existing montage leads plus the demo login account. */
export const MONTAGE_TEAM = ["Rachid Ait Said", "Walid Kaci", "Sofiane Meddah", "Yacine Boudiaf"] as const;

/** The company's installation fleet — assigned to a job alongside its team. */
export const MONTAGE_VEHICLES = ["Camion 20m³ — 123 ALG 45", "Camion 12m³ — 456 ORA 78", "Camionnette — 789 BLI 12"] as const;

export const MISSING_PIECE_STATUSES = ["Signalée", "Commandée", "Reçue"] as const;
export type MissingPieceStatus = (typeof MISSING_PIECE_STATUSES)[number];

export interface MontageMissingPieceRecord {
  id: string;
  jobId: string;
  name: string;
  quantity: number;
  status: MissingPieceStatus;
  reportedAt: string;
}

export interface MontageChecklistItemRecord {
  id: string;
  jobId: string;
  stage: MontageStage;
  label: string;
  done: boolean;
}

export const MONTAGE_PHOTO_PHASES = ["Avant", "Pendant", "Après"] as const;
export type MontagePhotoPhase = (typeof MONTAGE_PHOTO_PHASES)[number];

export interface MontagePhotoRecord {
  id: string;
  jobId: string;
  phase: MontagePhotoPhase;
  dataUrl: string | null;
  caption: string | null;
  uploadedBy: string;
  uploadedAt: string;
}

export interface MontageJobRecord {
  id: string;
  ref: string;
  projectId: string;
  projectRef: string;
  clientName: string;
  stage: MontageStage;
  priority: ProjectPriority;
  assignedTeam: string[];
  assignedVehicle: string | null;
  /** The planned installation appointment — drives the installation calendar. */
  scheduledDate: string;
  instructions: string;
  /** Set when the admin cancels the installation — independent of `stage`, which is left as-is for the record. */
  cancelled: boolean;
  cancelledAt: string | null;
  cancelledReason: string | null;
  signatureDataUrl: string | null;
  signedBy: string | null;
  signedAt: string | null;
  progress: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export const MONTAGE_JOBS: MontageJobRecord[] = [];

export const MONTAGE_MISSING_PIECES: MontageMissingPieceRecord[] = [];

const MONTAGE_CHECKLIST_TEMPLATE: { stage: MontageStage; label: string }[] = [
  { stage: "Planifié", label: "Plans et bon de livraison vérifiés" },
  { stage: "Arrivé", label: "État des lieux et protection du sol réalisés" },
  { stage: "Installation", label: "Caissons bas posés et de niveau" },
  { stage: "Installation", label: "Caissons hauts fixés" },
  { stage: "Installation", label: "Plan de travail posé et jointé" },
  { stage: "Ajustements finaux", label: "Portes et tiroirs réglés" },
  { stage: "Ajustements finaux", label: "Électroménager raccordé et testé" },
  { stage: "Nettoyage", label: "Chantier nettoyé, déchets évacués" },
  { stage: "Réception client", label: "Démonstration du fonctionnement faite au client" },
];

export const MONTAGE_CHECKLIST_ITEMS: MontageChecklistItemRecord[] = MONTAGE_JOBS.flatMap((job) => {
  const jobStageIndex = MONTAGE_STAGES.indexOf(job.stage);
  return MONTAGE_CHECKLIST_TEMPLATE.map((item, i) => ({
    id: `MCHK-${job.id}-${i + 1}`,
    jobId: job.id,
    stage: item.stage,
    label: item.label,
    done: MONTAGE_STAGES.indexOf(item.stage) < jobStageIndex,
  }));
});

export const MONTAGE_PHOTOS: MontagePhotoRecord[] = [];

export interface DevisVersionRecord {
  id: string;
  devisId: string;
  version: number;
  amount: number;
  projectLabel: string;
  status: DevisStatus;
  note: string;
  createdAt: string;
  createdBy: string;
}

/** Snapshots of superseded quote versions — empty until the first revision is issued. */
// DEVIS_VERSIONS moved to Postgres — see lib/data/devis.ts

export const PAYMENT_METHODS = ["Espèces", "Virement", "CCP", "Carte", "Autre"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type PaymentStatus = "Payé" | "En attente" | "En retard";

export interface PaymentRecord {
  id: string;
  clientId: string | null;
  clientName: string;
  /** The devis this payment was made against — set even once the devis becomes a project. */
  devisId: string | null;
  /** Null for a deposit paid on a devis that hasn't become a project yet. */
  projectId: string | null;
  projectRef: string | null;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  label: string;
  /** The payment date once the status is "Payé" — the expected due date otherwise. */
  date: string;
  notes: string;
  recordedBy: string;
  createdAt: string;
}

type PaymentSeed = Omit<PaymentRecord, "clientId" | "devisId" | "projectId" | "notes" | "recordedBy" | "createdAt"> & {
  /** Only set for a deposit paid against a devis that hasn't become a project yet. */
  devisRef?: string;
};

const PAYMENTS_SEED: PaymentSeed[] = [];

/**
 * The seed payments are enriched the same way as the seed projects above —
 * resolving each payment's project by ref. Client/devis FK resolution now
 * happens in Postgres (see lib/data/clients.ts / lib/data/devis.ts);
 * PAYMENTS_SEED is always empty for a fresh client demo, so those fields
 * simply resolve to null here.
 */
export const PAYMENTS: PaymentRecord[] = PAYMENTS_SEED.map(({ devisRef: _devisRef, ...p }) => {
  const project = p.projectRef ? PROJECTS.find((pr) => pr.ref === p.projectRef) : undefined;
  return {
    ...p,
    projectId: project?.id ?? null,
    projectRef: project?.ref ?? null,
    devisId: null,
    clientId: null,
    notes: "",
    recordedBy: "Comptabilité",
    createdAt: p.date,
  };
});

export const SAV_PRIORITIES = ["Basse", "Normale", "Haute", "Urgente"] as const;
export type SavPriority = (typeof SAV_PRIORITIES)[number];

export const SAV_STATUSES = ["Ouvert", "Planifié", "En cours", "Résolu"] as const;
export type SavStatus = (typeof SAV_STATUSES)[number];

export interface SavRecord {
  id: string;
  ref: string;
  clientId: string | null;
  clientName: string;
  projectRef: string;
  issue: string;
  priority: SavPriority;
  status: SavStatus;
  assignedTo: string;
  createdAt: string;
}

const SAV_TICKETS_SEED: Omit<SavRecord, "clientId">[] = [];

/** clientId resolution now happens in Postgres; SAV_TICKETS_SEED is always empty for a fresh client demo. */
export const SAV_TICKETS: SavRecord[] = SAV_TICKETS_SEED.map((t) => ({
  ...t,
  clientId: null,
}));

export type TaskStatus = "À faire" | "En cours" | "Terminée";

export interface TaskRecord {
  id: string;
  title: string;
  role: string;
  relatedRef: string;
  dueDate: string;
  status: TaskStatus;
  priority: "Basse" | "Normale" | "Haute";
}

export const TASKS: TaskRecord[] = [];

export type ActivityCategory = "lead" | "devis" | "projet" | "paiement" | "sav" | "client" | "production" | "vernissage" | "montage";

export interface ActivityRecord {
  id: string;
  category: ActivityCategory;
  message: string;
  actor: string;
  timestamp: string;
  clientName?: string;
}

export const ACTIVITY: ActivityRecord[] = [];

export interface NotificationRecord {
  id: string;
  title: string;
  description: string;
  category: ActivityCategory;
  timestamp: string;
}

export const NOTIFICATIONS: NotificationRecord[] = [];

export const DOCUMENT_CATEGORIES = [
  "Devis PDF",
  "Contrat",
  "Facture",
  "Reçu de paiement",
  "Plans",
  "Croquis",
  "Designs",
  "Rendus 3D",
  "Documents de production",
  "Documents de pose",
  "Procès-verbal de réception",
  "Garantie",
  "Autre",
] as const;
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export interface DocumentRecord {
  id: string;
  name: string;
  category: DocumentCategory;
  clientId: string | null;
  clientName: string;
  devisId: string | null;
  projectRef: string | null;
  /** Incremented on each new upload to an existing document; prior files live in DOCUMENT_VERSIONS. */
  version: number;
  fileName: string | null;
  mimeType: string | null;
  sizeLabel: string;
  /** The actual file content as a data URL. Null for historical/seed entries with no real bytes on hand. */
  dataUrl: string | null;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

type DocumentSeed = Omit<DocumentRecord, "clientId" | "devisId" | "version" | "fileName" | "mimeType" | "dataUrl" | "updatedAt"> & {
  devisId?: string | null;
};

const DOCUMENTS_SEED: DocumentSeed[] = [];

export const DOCUMENTS: DocumentRecord[] = DOCUMENTS_SEED.map((d) => ({
  ...d,
  clientId: null,
  devisId: d.devisId ?? null,
  version: d.id === "DOC-01" ? 2 : 1,
  fileName: d.name,
  mimeType: null,
  dataUrl: null,
  updatedAt: d.createdAt,
}));

export interface DocumentVersionRecord {
  id: string;
  documentId: string;
  version: number;
  fileName: string | null;
  mimeType: string | null;
  sizeLabel: string;
  dataUrl: string | null;
  uploadedBy: string;
  uploadedAt: string;
  note: string | null;
}

export const DOCUMENT_VERSIONS: DocumentVersionRecord[] = [];

export interface DocumentShareRecord {
  id: string;
  documentId: string;
  token: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string | null;
  revoked: boolean;
}

export const DOCUMENT_SHARES: DocumentShareRecord[] = [];

export type DocumentEventAction = "upload" | "new_version" | "share" | "revoke_share" | "download" | "view";

export interface DocumentEventRecord {
  id: string;
  documentId: string;
  action: DocumentEventAction;
  actor: string;
  timestamp: string;
  detail: string | null;
}

export const DOCUMENT_EVENTS: DocumentEventRecord[] = [];

export type MessageSender = "client" | "team";

export interface MessageRecord {
  id: string;
  clientName: string;
  sender: MessageSender;
  authorName: string;
  content: string;
  timestamp: string;
}

export const MESSAGES: MessageRecord[] = [];

export const APPOINTMENT_TYPES = [
  "Consultation",
  "Showroom",
  "Visite client",
  "Visite chantier",
  "Appel",
] as const;
export type AppointmentType = (typeof APPOINTMENT_TYPES)[number];

export const APPOINTMENT_STATUSES = ["Demandé", "Confirmé", "Terminé", "Reporté", "Annulé"] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export interface AppointmentRecord {
  id: string;
  type: AppointmentType;
  title: string;
  /** Optional links — an appointment can relate to any combination of these. */
  leadId: string | null;
  clientId: string | null;
  projectRef: string | null;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  /** ISO datetime of the appointment itself. */
  date: string;
  durationMinutes: number;
  location: string;
  commercial: string | null;
  designer: string | null;
  status: AppointmentStatus;
  notes: string;
  followUpNotes: string | null;
  reminderMinutesBefore: number | null;
  createdAt: string;
  source: "Public" | "Interne";
}

export const APPOINTMENTS: AppointmentRecord[] = [];

// --- Kitchen quote configurator -----------------------------------------

export const KITCHEN_LAYOUTS = ["En I", "En L", "En U", "Parallèle"] as const;
export type KitchenLayout = (typeof KITCHEN_LAYOUTS)[number];

export const ISLAND_OPTIONS = ["Avec îlot", "Sans îlot"] as const;
export type IslandOption = (typeof ISLAND_OPTIONS)[number];

export const DEPTH_OPTIONS = ["Simple profondeur", "Double profondeur"] as const;
export type DepthOption = (typeof DEPTH_OPTIONS)[number];

export const HOOD_OPTIONS = ["Hotte encastrée", "Hotte visible"] as const;
export type HoodOption = (typeof HOOD_OPTIONS)[number];

export const OVEN_OPTIONS = ["Four colonne encastré", "Four sous plan de cuisson", "Cuisinière"] as const;
export type OvenOption = (typeof OVEN_OPTIONS)[number];

export const FRIDGE_OPTIONS = ["Réfrigérateur encastré", "Réfrigérateur 1 porte", "Réfrigérateur 2 portes"] as const;
export type FridgeOption = (typeof FRIDGE_OPTIONS)[number];

export const ACCESSORY_OPTIONS = [
  "Tiroir à pain",
  "Rangement à épices",
  "Solution d'angle",
  "Poubelle encastrée",
  "Range-détergent",
  "Coin café d'angle escamotable",
  "Colonne de rangement (space tower)",
  "Niche décorative",
  "Argentier",
] as const;
export type AccessoryOption = (typeof ACCESSORY_OPTIONS)[number];

export const FLOOR_TYPES = ["Carrelage", "Parquet", "Béton ciré", "Autre"] as const;
export type FloorType = (typeof FLOOR_TYPES)[number];

export const CONFIGURATOR_BUDGETS = [
  "Moins de 1 000 000 DA",
  "1 000 000 — 1 800 000 DA",
  "1 800 000 — 2 500 000 DA",
  "Plus de 2 500 000 DA",
] as const;
export type ConfiguratorBudget = (typeof CONFIGURATOR_BUDGETS)[number];

export interface KitchenConfigFile {
  name: string;
  sizeLabel: string;
}

export interface KitchenConfigRecord {
  id: string;
  /** The devis this configuration produced — every configuration always has one. */
  devisId: string;
  layout: KitchenLayout;
  island: IslandOption;
  depth: DepthOption;
  hood: HoodOption;
  oven: OvenOption;
  fridge: FridgeOption;
  accessories: AccessoryOption[];
  budget: ConfiguratorBudget;
  floor: FloorType;
  dimensions: string;
  photos: KitchenConfigFile[];
  sketches: KitchenConfigFile[];
  additionalInfo: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  createdAt: string;
}

// KITCHEN_CONFIGS moved to Postgres — see lib/data/kitchen-config.ts

// --- Pricing engine: catalogue, devis line items, price history ---------

export const CATALOGUE_CATEGORIES = [
  "Caissons",
  "Façades",
  "Couleurs",
  "Plans de travail",
  "Poignées",
  "Quincaillerie",
  "Accessoires",
  "Électroménager",
  "Matériaux",
  "Finitions",
  "Vernissage",
  "Montage",
  "Transport",
] as const;
export type CatalogueCategory = (typeof CATALOGUE_CATEGORIES)[number];

export const CATALOGUE_UNITS = ["unité", "m²", "ml", "heure", "forfait"] as const;
export type CatalogueUnit = (typeof CATALOGUE_UNITS)[number];

export const CATALOGUE_AVAILABILITY_STATUSES = ["En stock", "Sur commande", "Rupture de stock"] as const;
export type CatalogueAvailability = (typeof CATALOGUE_AVAILABILITY_STATUSES)[number];

export interface CatalogueItemRecord {
  id: string;
  /** Internal reference shown to staff and suppliers — distinct from the random `id`. */
  sku: string;
  name: string;
  category: CatalogueCategory;
  unit: CatalogueUnit;
  unitPrice: number;
  /** Whether TVA applies when this line is billed — nearly always true, but some services are exempt. */
  taxable: boolean;
  availability: CatalogueAvailability;
  /** Soft-disable: hidden from new quotes but kept so existing devis lines referencing it stay valid. */
  active: boolean;
  description: string;
  updatedAt: string;
}

export const CATALOGUE_ITEMS: CatalogueItemRecord[] = [
  { id: "CAT-001", sku: "CAI-001", name: "Caisson bas 60cm", category: "Caissons", unit: "unité", unitPrice: 18000, taxable: true, availability: "En stock", active: true, description: "Caisson bas mélaminé 60cm, charnières incluses.", updatedAt: daysAgo(90) },
  { id: "CAT-002", sku: "CAI-002", name: "Caisson haut 40cm", category: "Caissons", unit: "unité", unitPrice: 14000, taxable: true, availability: "En stock", active: true, description: "Caisson haut mélaminé 40cm.", updatedAt: daysAgo(90) },
  { id: "CAT-003", sku: "CAI-003", name: "Caisson colonne 60cm", category: "Caissons", unit: "unité", unitPrice: 32000, taxable: true, availability: "Sur commande", active: true, description: "Caisson colonne pour four ou réfrigérateur encastré.", updatedAt: daysAgo(90) },
  { id: "CAT-004", sku: "FAC-001", name: "Façade laquée mate", category: "Façades", unit: "m²", unitPrice: 22000, taxable: true, availability: "En stock", active: true, description: "Façade MDF laquée mate, coloris au choix.", updatedAt: daysAgo(60) },
  { id: "CAT-005", sku: "FAC-002", name: "Façade bois massif chêne", category: "Façades", unit: "m²", unitPrice: 38000, taxable: true, availability: "Sur commande", active: true, description: "Façade en chêne massif, finition huilée ou vernie.", updatedAt: daysAgo(90) },
  { id: "CAT-006", sku: "FAC-003", name: "Façade stratifié", category: "Façades", unit: "m²", unitPrice: 12000, taxable: true, availability: "En stock", active: true, description: "Façade stratifié, gamme économique.", updatedAt: daysAgo(90) },
  { id: "COL-001", sku: "COL-001", name: "Blanc mat — RAL 9016", category: "Couleurs", unit: "m²", unitPrice: 0, taxable: true, availability: "En stock", active: true, description: "Coloris standard inclus, sans supplément.", updatedAt: daysAgo(90) },
  { id: "COL-002", sku: "COL-002", name: "Anthracite mat — RAL 7016", category: "Couleurs", unit: "m²", unitPrice: 0, taxable: true, availability: "En stock", active: true, description: "Coloris standard inclus, sans supplément.", updatedAt: daysAgo(90) },
  { id: "COL-003", sku: "COL-003", name: "Vert sauge — teinte spéciale", category: "Couleurs", unit: "m²", unitPrice: 1500, taxable: true, availability: "En stock", active: true, description: "Teinte laquée spéciale, supplément au m².", updatedAt: daysAgo(90) },
  { id: "COL-004", sku: "COL-004", name: "Bleu nuit — teinte spéciale", category: "Couleurs", unit: "m²", unitPrice: 1500, taxable: true, availability: "Sur commande", active: true, description: "Teinte laquée spéciale, supplément au m².", updatedAt: daysAgo(90) },
  { id: "CAT-007", sku: "PDT-001", name: "Plan de travail quartz", category: "Plans de travail", unit: "ml", unitPrice: 45000, taxable: true, availability: "En stock", active: true, description: "Plan de travail quartz reconstitué, épaisseur 3cm.", updatedAt: daysAgo(45) },
  { id: "CAT-008", sku: "PDT-002", name: "Plan de travail granit", category: "Plans de travail", unit: "ml", unitPrice: 38000, taxable: true, availability: "Rupture de stock", active: true, description: "Plan de travail granit naturel poli.", updatedAt: daysAgo(90) },
  { id: "CAT-009", sku: "PDT-003", name: "Plan de travail stratifié", category: "Plans de travail", unit: "ml", unitPrice: 9000, taxable: true, availability: "En stock", active: true, description: "Plan de travail stratifié, gamme économique.", updatedAt: daysAgo(90) },
  { id: "CAT-012", sku: "POI-001", name: "Poignée aluminium", category: "Poignées", unit: "unité", unitPrice: 900, taxable: true, availability: "En stock", active: true, description: "Poignée profilée aluminium brossé.", updatedAt: daysAgo(90) },
  { id: "POI-002", sku: "POI-002", name: "Poignée profil intégré", category: "Poignées", unit: "ml", unitPrice: 2200, taxable: true, availability: "En stock", active: true, description: "Profil de poignée intégré, finition aluminium.", updatedAt: daysAgo(90) },
  { id: "POI-003", sku: "POI-003", name: "Poignée laiton vieilli", category: "Poignées", unit: "unité", unitPrice: 1800, taxable: true, availability: "Sur commande", active: true, description: "Poignée laiton vieilli, style patrimonial.", updatedAt: daysAgo(90) },
  { id: "POI-004", sku: "POI-004", name: "Poignée invisible encastrée", category: "Poignées", unit: "ml", unitPrice: 2600, taxable: true, availability: "En stock", active: true, description: "Profil encastré sans poignée apparente.", updatedAt: daysAgo(90) },
  { id: "CAT-010", sku: "QUI-001", name: "Charnière amortisseur", category: "Quincaillerie", unit: "unité", unitPrice: 1200, taxable: true, availability: "En stock", active: true, description: "Charnière à fermeture amortie.", updatedAt: daysAgo(90) },
  { id: "CAT-011", sku: "QUI-002", name: "Coulisse tiroir soft-close", category: "Quincaillerie", unit: "unité", unitPrice: 3500, taxable: true, availability: "En stock", active: true, description: "Coulisse tiroir à fermeture douce, charge 40kg.", updatedAt: daysAgo(90) },
  { id: "CAT-013", sku: "ACC-001", name: "Tiroir à pain", category: "Accessoires", unit: "unité", unitPrice: 15000, taxable: true, availability: "En stock", active: true, description: "Tiroir à pain ventilé.", updatedAt: daysAgo(90) },
  { id: "CAT-014", sku: "ACC-002", name: "Rangement à épices", category: "Accessoires", unit: "unité", unitPrice: 9500, taxable: true, availability: "En stock", active: true, description: "Colonne coulissante à épices.", updatedAt: daysAgo(90) },
  { id: "CAT-015", sku: "ACC-003", name: "Solution d'angle", category: "Accessoires", unit: "unité", unitPrice: 21000, taxable: true, availability: "En stock", active: true, description: "Plateau tournant ou coulissant pour meuble d'angle.", updatedAt: daysAgo(90) },
  { id: "CAT-016", sku: "ACC-004", name: "Poubelle encastrée", category: "Accessoires", unit: "unité", unitPrice: 12000, taxable: true, availability: "En stock", active: true, description: "Poubelle coulissante double bac.", updatedAt: daysAgo(90) },
  { id: "CAT-017", sku: "ACC-005", name: "Colonne de rangement (space tower)", category: "Accessoires", unit: "unité", unitPrice: 48000, taxable: true, availability: "Sur commande", active: true, description: "Colonne de rangement coulissante multi-niveaux.", updatedAt: daysAgo(90) },
  { id: "CAT-018", sku: "ELEC-001", name: "Four encastrable", category: "Électroménager", unit: "unité", unitPrice: 65000, taxable: true, availability: "Sur commande", active: true, description: "Four encastrable multifonction.", updatedAt: daysAgo(20) },
  { id: "CAT-019", sku: "ELEC-002", name: "Plaque de cuisson induction", category: "Électroménager", unit: "unité", unitPrice: 55000, taxable: true, availability: "En stock", active: true, description: "Plaque à induction 4 foyers.", updatedAt: daysAgo(90) },
  { id: "CAT-020", sku: "ELEC-003", name: "Hotte aspirante encastrée", category: "Électroménager", unit: "unité", unitPrice: 32000, taxable: true, availability: "En stock", active: true, description: "Hotte encastrée sous meuble haut.", updatedAt: daysAgo(90) },
  { id: "CAT-021", sku: "ELEC-004", name: "Réfrigérateur encastré", category: "Électroménager", unit: "unité", unitPrice: 120000, taxable: true, availability: "Sur commande", active: true, description: "Réfrigérateur combiné encastrable.", updatedAt: daysAgo(90) },
  { id: "CAT-022", sku: "MAT-001", name: "Panneau MDF 19mm", category: "Matériaux", unit: "m²", unitPrice: 4500, taxable: true, availability: "En stock", active: true, description: "Panneau MDF hydrofuge 19mm.", updatedAt: daysAgo(90) },
  { id: "CAT-023", sku: "MAT-002", name: "Chant ABS", category: "Matériaux", unit: "ml", unitPrice: 800, taxable: true, availability: "En stock", active: true, description: "Chant ABS collé, coloris assorti.", updatedAt: daysAgo(90) },
  { id: "CAT-024", sku: "FIN-001", name: "Finition laquée brillante", category: "Finitions", unit: "m²", unitPrice: 6000, taxable: true, availability: "En stock", active: true, description: "Finition laquée brillante haute résistance.", updatedAt: daysAgo(90) },
  { id: "CAT-025", sku: "FIN-002", name: "Finition vernis mat", category: "Finitions", unit: "m²", unitPrice: 4500, taxable: true, availability: "En stock", active: true, description: "Finition vernie mate.", updatedAt: daysAgo(90) },
  { id: "CAT-026", sku: "VER-001", name: "Vernissage façades — forfait atelier", category: "Vernissage", unit: "forfait", unitPrice: 45000, taxable: true, availability: "En stock", active: true, description: "Vernissage complet des façades en atelier.", updatedAt: daysAgo(90) },
  { id: "CAT-027", sku: "VER-002", name: "Retouche vernis sur site", category: "Vernissage", unit: "heure", unitPrice: 8000, taxable: true, availability: "En stock", active: true, description: "Retouche de vernis directement chez le client.", updatedAt: daysAgo(90) },
  { id: "CAT-028", sku: "MON-001", name: "Montage complet cuisine", category: "Montage", unit: "forfait", unitPrice: 60000, taxable: true, availability: "En stock", active: true, description: "Pose complète de la cuisine chez le client.", updatedAt: daysAgo(90) },
  { id: "CAT-029", sku: "MON-002", name: "Heure supplémentaire montage", category: "Montage", unit: "heure", unitPrice: 3500, taxable: true, availability: "En stock", active: true, description: "Heure de montage additionnelle.", updatedAt: daysAgo(90) },
  { id: "CAT-030", sku: "TRA-001", name: "Transport Alger", category: "Transport", unit: "forfait", unitPrice: 8000, taxable: false, availability: "En stock", active: true, description: "Livraison dans la wilaya d'Alger.", updatedAt: daysAgo(90) },
  { id: "CAT-031", sku: "TRA-002", name: "Transport hors wilaya", category: "Transport", unit: "forfait", unitPrice: 18000, taxable: false, availability: "En stock", active: true, description: "Livraison hors wilaya d'Alger.", updatedAt: daysAgo(90) },
];

export interface PriceHistoryRecord {
  id: string;
  itemId: string;
  previousPrice: number;
  newPrice: number;
  changedBy: string;
  changedAt: string;
  note: string | null;
}

export const PRICE_HISTORY: PriceHistoryRecord[] = [];

export interface DevisLineItem {
  id: string;
  devisId: string;
  /** null for a manually-typed custom line not tied to a catalogue entry. */
  catalogueItemId: string | null;
  label: string;
  category: CatalogueCategory | "Autre";
  unit: CatalogueUnit;
  quantity: number;
  /** Snapshotted from the catalogue at add-time, then independently editable per quote. */
  unitPrice: number;
}

// DEVIS_LINE_ITEMS moved to Postgres — see lib/data/pricing.ts

// --- Team / employee profiles --------------------------------------------------

export const AVAILABILITY_STATUSES = ["Disponible", "En congé", "Indisponible"] as const;
export type AvailabilityStatus = (typeof AVAILABILITY_STATUSES)[number];

export const AVAILABILITY_BADGE: Record<AvailabilityStatus, "success" | "gold" | "danger"> = {
  Disponible: "success",
  "En congé": "gold",
  Indisponible: "danger",
};

/**
 * Profile details for a staff member, beyond the bare name/email/role/active
 * stored on the real auth `users` row (see lib/auth/queries.ts) — this is
 * business/HR data, so it lives in-memory alongside the rest of the app's
 * fake backend rather than in the SQLite auth schema. Keyed by email, the
 * one identifier that's known both for the seeded demo accounts (fixed) and
 * for a newly-invited employee (chosen at creation time) — unlike the auth
 * user's `id`, which is only generated once the real DB row is inserted.
 */
export interface EmployeeProfileRecord {
  email: string;
  phone: string;
  department: string;
  hireDate: string;
  bio: string;
  availability: AvailabilityStatus;
  availabilityNote: string;
}

export const EMPLOYEE_PROFILES: EmployeeProfileRecord[] = [
  { email: "admin@art-cuisine.dz", phone: "+213 5 55 00 00 01", department: "Direction", hireDate: daysAgo(900), bio: "Fondatrice d'ART Cuisine, supervise l'ensemble des opérations.", availability: "Disponible", availabilityNote: "" },
  { email: "commercial@art-cuisine.dz", phone: "+213 5 55 11 22 10", department: "Commercial", hireDate: daysAgo(620), bio: "Responsable du portefeuille clients Alger et Blida.", availability: "Disponible", availabilityNote: "" },
  { email: "designer@art-cuisine.dz", phone: "+213 6 61 22 33 10", department: "Bureau d'étude", hireDate: daysAgo(500), bio: "Conçoit les plans et rendus 3D des projets sur mesure.", availability: "Disponible", availabilityNote: "" },
  { email: "production@art-cuisine.dz", phone: "+213 7 71 33 44 10", department: "Atelier", hireDate: daysAgo(780), bio: "Responsable de l'atelier de fabrication — caissons, façades, plans de travail.", availability: "Disponible", availabilityNote: "" },
  { email: "vernisseur@art-cuisine.dz", phone: "+213 5 55 44 55 10", department: "Finition", hireDate: daysAgo(410), bio: "Spécialiste vernissage et finitions laquées.", availability: "En congé", availabilityNote: "Congé annuel — retour prévu dans 5 jours." },
  { email: "montage@art-cuisine.dz", phone: "+213 6 62 55 66 10", department: "Pose", hireDate: daysAgo(540), bio: "Chef d'équipe montage et SAV terrain.", availability: "Disponible", availabilityNote: "" },
];

// --- Portfolio (public "Nos réalisations") -----------------------------------

export const PORTFOLIO_CATEGORIES = [
  "Épurée",
  "Contemporaine",
  "Naturelle",
  "Minérale",
  "Traditionnelle",
  "Industrielle",
] as const;
export type PortfolioCategory = (typeof PORTFOLIO_CATEGORIES)[number];

export const PORTFOLIO_STATUSES = ["Brouillon", "Publié", "Archivé"] as const;
export type PortfolioStatus = (typeof PORTFOLIO_STATUSES)[number];

export interface PortfolioImageRecord {
  id: string;
  dataUrl: string;
  caption: string | null;
  order: number;
}

export interface PortfolioProjectRecord {
  id: string;
  slug: string;
  title: string;
  category: PortfolioCategory;
  layout: string;
  location: string;
  year: number;
  surface: string;
  summary: string;
  /** Paragraphs rendered on the detail page — one <p> per entry. */
  description: string[];
  materials: string[];
  finishes: string[];
  images: PortfolioImageRecord[];
  status: PortfolioStatus;
  featured: boolean;
  /** Display order on the public listing — lower first. */
  order: number;
  /** Optional link back to the CRM project this portfolio entry was published from. */
  sourceProjectRef: string | null;
  createdAt: string;
  updatedAt: string;
}

export const PORTFOLIO_PROJECTS: PortfolioProjectRecord[] = [];

// --- Messaging (conversations) ------------------------------------------------

export const CONVERSATION_TYPES = ["client_commercial", "client_designer", "client_company", "internal", "project"] as const;
export type ConversationType = (typeof CONVERSATION_TYPES)[number];

export interface ConversationParticipant {
  email: string;
  name: string;
  /** Free-text display label (e.g. "Commercial", "Designer", "Client", "Interne") — not the account's system Role. */
  role: string;
}

export interface ConversationRecord {
  id: string;
  type: ConversationType;
  title: string;
  clientId: string | null;
  clientName: string | null;
  projectRef: string | null;
  participants: ConversationParticipant[];
  createdAt: string;
  /** Bumped on every new message — the sort key for "most recent conversation first". */
  updatedAt: string;
}

export interface MessageAttachmentRecord {
  id: string;
  fileName: string;
  mimeType: string;
  sizeLabel: string;
  dataUrl: string;
}

export interface ConversationMessageRecord {
  id: string;
  conversationId: string;
  authorEmail: string;
  authorName: string;
  authorRole: string;
  content: string;
  attachments: MessageAttachmentRecord[];
  createdAt: string;
  /** Emails of participants who have opened this message. */
  readBy: string[];
}

export const CONVERSATIONS: ConversationRecord[] = [];

export const CONVERSATION_MESSAGES: ConversationMessageRecord[] = [];

// --- Notifications -------------------------------------------------------------

export const NOTIFICATION_TYPES = [
  "new_lead", "new_client", "new_devis", "devis_accepted", "devis_refused",
  "design_revision_requested", "design_approved", "production_started", "production_delayed",
  "vernissage_assigned", "quality_issue", "montage_scheduled", "montage_delayed",
  "payment_received", "payment_overdue", "sav_created", "task_assigned", "new_message",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** A per-recipient notification-center entry — distinct from the admin-only NOTIFICATIONS activity ticker above. */
export interface UserNotificationRecord {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  recipientEmail: string;
  link: string | null;
  read: boolean;
  readAt: string | null;
  createdAt: string;
}

export const USER_NOTIFICATIONS: UserNotificationRecord[] = [];
