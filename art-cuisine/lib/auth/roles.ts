export const ROLES = [
  "admin",
  "commercial",
  "designer",
  "production",
  "vernisseur",
  "montage",
  "client",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrateur",
  commercial: "Commercial",
  designer: "Designer / Bureau d'étude",
  production: "Production",
  vernisseur: "Vernisseur",
  montage: "Agent Montage",
  client: "Client",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  admin: "Accès complet à toutes les données et paramètres de l'entreprise.",
  commercial: "Gère les clients, les leads et les devis jusqu'à la signature.",
  designer: "Conçoit les plans, les rendus 3D et valide les matériaux du projet.",
  production: "Suit la fabrication des caissons, façades et plans de travail.",
  vernisseur: "Réalise et suit les opérations de vernissage et de finition.",
  montage: "Planifie et exécute la pose chez le client, gère le SAV terrain.",
  client: "Suit son propre projet, ses devis et ses demandes SAV.",
};

/** Roles that belong to the internal team, as opposed to the client portal. */
export const STAFF_ROLES: Role[] = [
  "admin",
  "commercial",
  "designer",
  "production",
  "vernisseur",
  "montage",
];

export function isStaffRole(role: Role): boolean {
  return STAFF_ROLES.includes(role);
}

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}
