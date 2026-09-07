/**
 * The permission model.
 *
 * Pure data and pure functions — no database, no requests. This phase
 * builds the experience and the rules; the rules are written here rather
 * than inside components so that when they move behind Supabase, the
 * policies have something exact to be checked against.
 *
 * The hierarchy is Workspace → Space → Project → Task. Permission is
 * granted at any level and RESOLVED downwards: the most specific grant
 * wins, which is what lets one person be an Editor on one project and a
 * Viewer on the next without touching their standing anywhere else.
 */

export type PermissionLevel = "admin" | "editor" | "commenter" | "viewer";

/** Ordered weakest to strongest, so levels can be compared. */
export const PERMISSION_ORDER: PermissionLevel[] = ["viewer", "commenter", "editor", "admin"];

export const PERMISSION_META: Record<
  PermissionLevel,
  { label: string; summary: string; can: string[]; tone: string }
> = {
  admin: {
    label: "Admin",
    summary: "Full control, including members and settings",
    can: ["Everything an editor can", "Add and remove members", "Change permissions", "Delete the project"],
    tone: "bg-primary-muted text-primary ring-primary/40",
  },
  editor: {
    label: "Editor",
    summary: "Can create and change content",
    can: ["Everything a commenter can", "Create and edit tasks", "Upload files", "Edit documents"],
    tone: "bg-info-subtle text-info ring-info/40",
  },
  commenter: {
    label: "Commenter",
    summary: "Can view and comment, but not change",
    can: ["Everything a viewer can", "Comment on tasks", "React to messages"],
    tone: "bg-warning-subtle text-warning ring-warning/40",
  },
  viewer: {
    label: "Viewer",
    summary: "Read-only",
    can: ["See tasks, documents and files", "See who is on the project"],
    tone: "bg-surface-elevated text-text-secondary ring-border",
  },
};

/**
 * Who can reach a project at all, before permission levels are considered.
 *
 * These are three different questions, not three strengths of one — a
 * private project is not "a stricter workspace project", it has a
 * different list of people entirely.
 */
export type ProjectVisibility = "workspace" | "space" | "private";

export const VISIBILITY_META: Record<
  ProjectVisibility,
  { label: string; description: string }
> = {
  workspace: {
    label: "Anyone in the workspace",
    description: "Everybody in Tyriaq can find and open this project.",
  },
  space: {
    label: "Space members only",
    description: "People in the parent space, plus anybody added directly.",
  },
  private: {
    label: "Private",
    description: "Only the people listed here. It will not appear for anybody else.",
  },
};

export interface SamplePerson {
  id: string;
  name: string;
  email: string;
  /** Their standing across the whole workspace. */
  workspaceRole: "owner" | "admin" | "member" | "guest";
  title: string;
  /** Set when an invitation has been sent but not accepted. */
  pending?: boolean;
}

export interface SpaceMembership {
  personId: string;
  level: PermissionLevel;
}

export interface ProjectGrant {
  personId: string;
  level: PermissionLevel;
}

export interface SampleProject {
  id: string;
  name: string;
  spaceId: string;
  visibility: ProjectVisibility;
  /** Direct grants, which override anything inherited from the space. */
  grants: ProjectGrant[];
}

export interface SampleSpace {
  id: string;
  name: string;
  color: "violet" | "blue" | "emerald" | "amber" | "rose" | "cyan";
  members: SpaceMembership[];
}

/* ------------------------------------------------------------------ */
/* Resolution                                                          */
/* ------------------------------------------------------------------ */

export type PermissionSource = "workspace" | "space" | "project" | "none";

export interface ResolvedPermission {
  level: PermissionLevel | null;
  source: PermissionSource;
  /** Human wording for the badge's tooltip and the members list. */
  reason: string;
}

/**
 * What one person may do on one project.
 *
 * Resolved in order of specificity, and the FIRST answer wins:
 *
 *   1. a workspace owner or admin is an admin everywhere — there has to
 *      be somebody who can always get back in
 *   2. a direct grant on the project
 *   3. the space membership, if the project is visible to the space
 *   4. the workspace, if the project is open to it
 *   5. nothing
 *
 * Note that a direct grant can be LOWER than the inherited one. That is
 * the point of the example in the brief: Space says Editor, this one
 * project says Viewer, and the project wins. A model where the strongest
 * grant won could never express that.
 */
export function resolvePermission(
  person: SamplePerson,
  project: SampleProject,
  space: SampleSpace | undefined
): ResolvedPermission {
  if (person.workspaceRole === "owner" || person.workspaceRole === "admin") {
    return {
      level: "admin",
      source: "workspace",
      reason: `Workspace ${person.workspaceRole} — admin everywhere`,
    };
  }

  const direct = project.grants.find((grant) => grant.personId === person.id);
  if (direct) {
    return { level: direct.level, source: "project", reason: "Set on this project" };
  }

  const inherited = space?.members.find((member) => member.personId === person.id);
  if (inherited && project.visibility !== "private") {
    return {
      level: inherited.level,
      source: "space",
      reason: `Inherited from ${space?.name ?? "the space"}`,
    };
  }

  if (project.visibility === "workspace" && person.workspaceRole !== "guest") {
    return { level: "viewer", source: "workspace", reason: "Open to everyone in the workspace" };
  }

  return { level: null, source: "none", reason: "No access" };
}

/** Everyone who can reach a project, strongest first. */
export function projectAudience(
  people: SamplePerson[],
  project: SampleProject,
  space: SampleSpace | undefined
): { person: SamplePerson; permission: ResolvedPermission }[] {
  return people
    .map((person) => ({ person, permission: resolvePermission(person, project, space) }))
    .filter((row) => row.permission.level !== null)
    .sort((a, b) => {
      const byLevel =
        PERMISSION_ORDER.indexOf(b.permission.level!) - PERMISSION_ORDER.indexOf(a.permission.level!);
      return byLevel !== 0 ? byLevel : a.person.name.localeCompare(b.person.name);
    });
}

export function canManage(permission: ResolvedPermission): boolean {
  return permission.level === "admin";
}

/* ------------------------------------------------------------------ */
/* Sample workspace                                                    */
/* ------------------------------------------------------------------ */

/**
 * Realistic people, for building the flow against.
 *
 * Deliberately mixed: an owner, an admin, several members, a guest who
 * should see almost nothing, and an invitation that has not been
 * accepted — the cases a permissions screen actually has to render, as
 * opposed to five interchangeable editors.
 */
export const SAMPLE_PEOPLE: SamplePerson[] = [
  { id: "p-hakim", name: "Hakim Tebani", email: "hakim@tyriaq.app", workspaceRole: "owner", title: "Founder" },
  { id: "p-amina", name: "Amina Cherifi", email: "amina@tyriaq.app", workspaceRole: "admin", title: "Head of Product" },
  { id: "p-ahmed", name: "Ahmed Bensalah", email: "ahmed@tyriaq.app", workspaceRole: "member", title: "Designer" },
  { id: "p-lina", name: "Lina Meddour", email: "lina@tyriaq.app", workspaceRole: "member", title: "Engineer" },
  { id: "p-yacine", name: "Yacine Haddad", email: "yacine@tyriaq.app", workspaceRole: "member", title: "Engineer" },
  { id: "p-sofia", name: "Sofia Bouzid", email: "sofia@tyriaq.app", workspaceRole: "member", title: "Marketing" },
  { id: "p-karim", name: "Karim Ould", email: "karim@tyriaq.app", workspaceRole: "member", title: "Data" },
  { id: "p-nadia", name: "Nadia Slimani", email: "nadia@agence.dz", workspaceRole: "guest", title: "Agency partner" },
  { id: "p-rania", name: "Rania Belkacem", email: "rania@tyriaq.app", workspaceRole: "member", title: "Content", pending: true },
];

export const SAMPLE_SPACES: SampleSpace[] = [
  {
    id: "s-marketing",
    name: "Marketing",
    color: "rose",
    members: [
      { personId: "p-sofia", level: "admin" },
      { personId: "p-ahmed", level: "editor" },
      { personId: "p-rania", level: "editor" },
      { personId: "p-karim", level: "commenter" },
    ],
  },
  {
    id: "s-product",
    name: "Product",
    color: "violet",
    members: [
      { personId: "p-ahmed", level: "editor" },
      { personId: "p-lina", level: "editor" },
      { personId: "p-yacine", level: "editor" },
      { personId: "p-karim", level: "viewer" },
    ],
  },
  {
    id: "s-clients",
    name: "Clients",
    color: "amber",
    members: [
      { personId: "p-sofia", level: "editor" },
      { personId: "p-nadia", level: "commenter" },
    ],
  },
];

/**
 * The example from the brief, made real: Ahmed is an Editor in Marketing,
 * and each project below tells a different story about him.
 */
export const SAMPLE_PROJECTS: SampleProject[] = [
  {
    id: "pr-campaign",
    name: "Spring campaign",
    spaceId: "s-marketing",
    visibility: "space",
    grants: [],
  },
  {
    id: "pr-brand",
    name: "Brand refresh",
    spaceId: "s-marketing",
    visibility: "space",
    // Ahmed is an Editor in the space, but only a Viewer here.
    grants: [{ personId: "p-ahmed", level: "viewer" }],
  },
  {
    id: "pr-pricing",
    name: "Pricing page",
    spaceId: "s-marketing",
    visibility: "space",
    grants: [{ personId: "p-ahmed", level: "commenter" }],
  },
  {
    id: "pr-mobile",
    name: "Mobile app",
    spaceId: "s-product",
    visibility: "workspace",
    grants: [{ personId: "p-sofia", level: "commenter" }],
  },
  {
    id: "pr-salaries",
    name: "Compensation review",
    spaceId: "s-product",
    visibility: "private",
    grants: [
      { personId: "p-lina", level: "editor" },
    ],
  },
  {
    id: "pr-agency",
    name: "Agency handover",
    spaceId: "s-clients",
    visibility: "space",
    grants: [{ personId: "p-nadia", level: "editor" }],
  },
];
