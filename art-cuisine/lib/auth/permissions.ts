import type { Role } from "@/lib/auth/roles";

export const PERMISSIONS = [
  "dashboard.view",
  "clients.manage",
  "leads.manage",
  "devis.manage",
  "catalogue.manage",
  "documents.manage",
  "documents.view_own",
  "projects.view",
  "projects.manage",
  "conception.manage",
  "production.manage",
  "vernissage.manage",
  "montage.manage",
  "sav.manage",
  "sav.view_own",
  "finance.manage",
  "equipe.manage",
  "portefeuille.view",
  "portefeuille.manage",
  "materiaux.manage",
  "rapports.view",
  "parametres.manage",
  "devis.view_own",
  "projects.view_own",
  "payments.view_own",
  "profile.manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/**
 * The full permission matrix — the single source of truth for what each
 * role may access. Every route guard and every sidebar filter reads from
 * this map, so granting or revoking a capability here is enough to change
 * behaviour everywhere.
 */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  admin: [...PERMISSIONS],
  commercial: [
    "dashboard.view",
    "clients.manage",
    "leads.manage",
    "devis.manage",
    "documents.manage",
    "projects.view",
    "projects.manage",
    "finance.manage",
    "portefeuille.view",
    "rapports.view",
    "profile.manage",
  ],
  designer: [
    "dashboard.view",
    "projects.view",
    "projects.manage",
    "conception.manage",
    "devis.view_own",
    "documents.manage",
    "materiaux.manage",
    "portefeuille.manage",
    "profile.manage",
  ],
  production: [
    "dashboard.view",
    "production.manage",
    "projects.view",
    "projects.manage",
    "documents.manage",
    "materiaux.manage",
    "profile.manage",
  ],
  vernisseur: [
    "dashboard.view",
    "vernissage.manage",
    "projects.view",
    "projects.manage",
    "documents.manage",
    "profile.manage",
  ],
  montage: [
    "dashboard.view",
    "montage.manage",
    "sav.manage",
    "projects.view",
    "projects.manage",
    "documents.manage",
    "profile.manage",
  ],
  client: [
    "dashboard.view",
    "devis.view_own",
    "projects.view_own",
    "payments.view_own",
    "sav.view_own",
    "documents.view_own",
    "profile.manage",
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}
