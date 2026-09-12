/**
 * Sample operations data.
 *
 * The admin panel is the back office for the whole platform, so it has
 * no real source yet — a Tyriaq deployment has one workspace and one
 * person in it. This file stands in for the shape those queries will
 * return, and is deliberately awkward in the right places: trials about
 * to lapse, a past-due account, a suspended user, a workspace at its
 * storage limit. A dataset of healthy rows makes a dashboard that has
 * never been tested against the day something is wrong.
 */

export type PlanId = "free" | "team" | "business" | "pro" | "enterprise";
export type UserStatus = "active" | "invited" | "suspended";
export type SubscriptionStatus = "active" | "trialing" | "past_due" | "cancelled";
export type WorkspaceStatus = "active" | "archived" | "over_limit";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  workspace: string;
  workspaceId: string;
  plan: PlanId;
  status: UserStatus;
  role: "owner" | "admin" | "member";
  joined: string;
  lastActive: string;
  country: string;
  tasksCreated: number;
  storageMb: number;
}

export interface AdminWorkspace {
  id: string;
  name: string;
  ownerName: string;
  ownerEmail: string;
  members: number;
  plan: PlanId;
  projects: number;
  tasks: number;
  storageMb: number;
  storageLimitMb: number;
  status: WorkspaceStatus;
  created: string;
  lastActive: string;
}

export interface AdminSubscription {
  id: string;
  customer: string;
  email: string;
  workspace: string;
  plan: PlanId;
  status: SubscriptionStatus;
  cycle: "monthly" | "yearly";
  renews: string;
  amount: number;
  since: string;
}

export interface AdminPlan {
  id: PlanId;
  name: string;
  price: number;
  cycle: "monthly" | "yearly";
  memberLimit: number | null;
  storageLimitGb: number | null;
  features: string[];
  subscribers: number;
  archived?: boolean;
}

export interface AuditEntry {
  id: string;
  admin: string;
  action: string;
  target: string;
  kind: "user" | "workspace" | "subscription" | "plan" | "permission" | "system";
  at: string;
  ip: string;
  session: string;
  result: "success" | "failed" | "denied";
}

export interface ServiceStatus {
  id: string;
  name: string;
  state: "operational" | "degraded" | "down";
  uptime: string;
  detail: string;
  latencyMs: number;
}

export interface SupportTicket {
  id: string;
  subject: string;
  requester: string;
  workspace: string;
  priority: "urgent" | "high" | "normal";
  status: "open" | "waiting" | "resolved";
  opened: string;
  plan: PlanId;
}

export const PLAN_META: Record<PlanId, { label: string; tone: string }> = {
  free: { label: "Free", tone: "bg-surface-elevated text-text-secondary ring-border" },
  team: { label: "Team", tone: "bg-info-subtle text-info ring-info/30" },
  business: { label: "Business", tone: "bg-primary-muted text-primary ring-primary/30" },
  pro: { label: "Pro", tone: "bg-warning-subtle text-warning ring-warning/30" },
  enterprise: { label: "Enterprise", tone: "bg-success-subtle text-success ring-success/30" },
};

export const PLANS: AdminPlan[] = [
  {
    id: "free", name: "Free", price: 0, cycle: "monthly", memberLimit: 3, storageLimitGb: 1,
    features: ["Up to 3 members", "2 projects", "Board and list views", "Community support"],
    subscribers: 71,
  },
  {
    id: "team", name: "Team", price: 9, cycle: "monthly", memberLimit: 10, storageLimitGb: 20,
    features: ["Up to 10 members", "Unlimited projects", "Calendar and timeline", "Email support"],
    subscribers: 161,
  },
  {
    id: "business", name: "Business", price: 19, cycle: "monthly", memberLimit: 50, storageLimitGb: 100,
    features: ["Up to 50 members", "Documents and chat", "Reporting", "Priority support"],
    subscribers: 250,
  },
  {
    id: "pro", name: "Pro", price: 29, cycle: "monthly", memberLimit: 200, storageLimitGb: 500,
    features: ["Up to 200 members", "Advanced permissions", "Audit history", "SSO"],
    subscribers: 375,
  },
  {
    id: "enterprise", name: "Enterprise", price: 79, cycle: "monthly", memberLimit: null, storageLimitGb: null,
    features: ["Unlimited members", "Unlimited storage", "Dedicated support", "Custom contract"],
    subscribers: 35,
  },
];

/** Headline figures, each with the equivalent number a month earlier. */
export const KPIS = {
  totalUsers: { value: 12842, previous: 11466 },
  activeUsers: { value: 10324, previous: 8749 },
  workspaces: { value: 1208, previous: 1108 },
  subscriptions: { value: 892, previous: 782 },
  mrr: { value: 89420, previous: 73295 },
  newUsers: { value: 2341, previous: 1774 },
  churned: { value: 148, previous: 121 },
};

/**
 * Thirty days of growth.
 *
 * Generated from a seed rather than typed out, so the series is smooth
 * and dated relative to today — a hardcoded chart is stale the week
 * after it is written.
 */
function series(days: number, start: number, drift: number, wobble: number): { date: string; value: number }[] {
  const out: { date: string; value: number }[] = [];
  let value = start;
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    // Deterministic pseudo-noise: the same shape on every render, so the
    // chart does not twitch between server and client.
    const noise = Math.sin(i * 1.7) * wobble;
    value += drift + noise;
    out.push({ date: d.toISOString().slice(0, 10), value: Math.max(0, Math.round(value)) });
  }
  return out;
}

export const USER_SERIES = series(30, 11100, 58, 40);
export const REVENUE_SERIES = series(30, 71500, 600, 420);
export const SUBSCRIPTION_SERIES = series(30, 770, 4, 3);

const DAY = 86_400_000;
function daysAgo(n: number): string {
  return new Date(Date.now() - n * DAY).toISOString();
}

export const USERS: AdminUser[] = [
  { id: "u-sarah", name: "Sarah Benali", email: "sarah@exemple.com", workspace: "Digital Agency", workspaceId: "w-digital", plan: "pro", status: "active", role: "owner", joined: daysAgo(2), lastActive: daysAgo(0), country: "DZ", tasksCreated: 312, storageMb: 1840 },
  { id: "u-yacine", name: "Yacine Khelil", email: "yacine@exemple.com", workspace: "Medical Academy", workspaceId: "w-medical", plan: "business", status: "active", role: "owner", joined: daysAgo(2), lastActive: daysAgo(0), country: "DZ", tasksCreated: 208, storageMb: 920 },
  { id: "u-imane", name: "Imane Zeroual", email: "imane@exemple.com", workspace: "E-commerce", workspaceId: "w-ecom", plan: "team", status: "active", role: "admin", joined: daysAgo(3), lastActive: daysAgo(1), country: "MA", tasksCreated: 96, storageMb: 410 },
  { id: "u-oussama", name: "Oussama Fouad", email: "oussama@exemple.com", workspace: "Product Team", workspaceId: "w-product", plan: "free", status: "active", role: "member", joined: daysAgo(4), lastActive: daysAgo(2), country: "TN", tasksCreated: 24, storageMb: 60 },
  { id: "u-nadia", name: "Nadia Chekroun", email: "nadia@exemple.com", workspace: "Marketing 2025", workspaceId: "w-marketing", plan: "pro", status: "active", role: "owner", joined: daysAgo(4), lastActive: daysAgo(0), country: "FR", tasksCreated: 271, storageMb: 2210 },
  { id: "u-karim", name: "Karim Larbi", email: "karim@exemple.com", workspace: "Marketing 2025", workspaceId: "w-marketing", plan: "pro", status: "active", role: "admin", joined: daysAgo(9), lastActive: daysAgo(0), country: "FR", tasksCreated: 187, storageMb: 640 },
  { id: "u-amine", name: "Amine Boudiaf", email: "amine@exemple.com", workspace: "Digital Agency", workspaceId: "w-digital", plan: "pro", status: "active", role: "member", joined: daysAgo(12), lastActive: daysAgo(1), country: "DZ", tasksCreated: 143, storageMb: 380 },
  { id: "u-sabrina", name: "Sabrina Kaci", email: "sabrina@exemple.com", workspace: "Medical Academy", workspaceId: "w-medical", plan: "business", status: "active", role: "admin", joined: daysAgo(15), lastActive: daysAgo(3), country: "DZ", tasksCreated: 88, storageMb: 210 },
  { id: "u-dahlia", name: "Dahlia Meziane", email: "dahlia@exemple.com", workspace: "Product Team", workspaceId: "w-product", plan: "free", status: "invited", role: "member", joined: daysAgo(1), lastActive: daysAgo(1), country: "DZ", tasksCreated: 0, storageMb: 0 },
  { id: "u-rachid", name: "Rachid Slimani", email: "rachid@exemple.com", workspace: "E-commerce", workspaceId: "w-ecom", plan: "team", status: "suspended", role: "member", joined: daysAgo(64), lastActive: daysAgo(31), country: "MA", tasksCreated: 402, storageMb: 1120 },
  { id: "u-lina", name: "Lina Haddad", email: "lina@exemple.com", workspace: "Studio Nord", workspaceId: "w-studio", plan: "enterprise", status: "active", role: "owner", joined: daysAgo(120), lastActive: daysAgo(0), country: "FR", tasksCreated: 1204, storageMb: 8400 },
  { id: "u-omar", name: "Omar Belkacem", email: "omar@exemple.com", workspace: "Studio Nord", workspaceId: "w-studio", plan: "enterprise", status: "active", role: "member", joined: daysAgo(118), lastActive: daysAgo(5), country: "FR", tasksCreated: 640, storageMb: 3100 },
  { id: "u-hind", name: "Hind Toumi", email: "hind@exemple.com", workspace: "Freelance", workspaceId: "w-freelance", plan: "free", status: "active", role: "owner", joined: daysAgo(46), lastActive: daysAgo(18), country: "TN", tasksCreated: 31, storageMb: 92 },
  { id: "u-farid", name: "Farid Ouali", email: "farid@exemple.com", workspace: "Consulting Co", workspaceId: "w-consult", plan: "business", status: "active", role: "owner", joined: daysAgo(87), lastActive: daysAgo(2), country: "DZ", tasksCreated: 522, storageMb: 2760 },
  { id: "u-selma", name: "Selma Ait", email: "selma@exemple.com", workspace: "Consulting Co", workspaceId: "w-consult", plan: "business", status: "active", role: "member", joined: daysAgo(80), lastActive: daysAgo(9), country: "DZ", tasksCreated: 214, storageMb: 730 },
];

export const WORKSPACES: AdminWorkspace[] = [
  { id: "w-digital", name: "Digital Agency", ownerName: "Sarah Benali", ownerEmail: "sarah@exemple.com", members: 12, plan: "pro", projects: 18, tasks: 642, storageMb: 4200, storageLimitMb: 512000, status: "active", created: daysAgo(2), lastActive: daysAgo(0) },
  { id: "w-medical", name: "Medical Academy", ownerName: "Yacine Khelil", ownerEmail: "yacine@exemple.com", members: 24, plan: "business", projects: 31, tasks: 1204, storageMb: 68000, storageLimitMb: 102400, status: "active", created: daysAgo(3), lastActive: daysAgo(0) },
  { id: "w-ecom", name: "E-commerce", ownerName: "Imane Zeroual", ownerEmail: "imane@exemple.com", members: 8, plan: "team", projects: 9, tasks: 288, storageMb: 19600, storageLimitMb: 20480, status: "over_limit", created: daysAgo(4), lastActive: daysAgo(1) },
  { id: "w-product", name: "Product Team", ownerName: "Oussama Fouad", ownerEmail: "oussama@exemple.com", members: 15, plan: "free", projects: 2, tasks: 41, storageMb: 340, storageLimitMb: 1024, status: "active", created: daysAgo(5), lastActive: daysAgo(2) },
  { id: "w-marketing", name: "Marketing 2025", ownerName: "Nadia Chekroun", ownerEmail: "nadia@exemple.com", members: 7, plan: "pro", projects: 12, tasks: 396, storageMb: 8800, storageLimitMb: 512000, status: "active", created: daysAgo(6), lastActive: daysAgo(0) },
  { id: "w-studio", name: "Studio Nord", ownerName: "Lina Haddad", ownerEmail: "lina@exemple.com", members: 64, plan: "enterprise", projects: 88, tasks: 5210, storageMb: 240000, storageLimitMb: 0, status: "active", created: daysAgo(120), lastActive: daysAgo(0) },
  { id: "w-consult", name: "Consulting Co", ownerName: "Farid Ouali", ownerEmail: "farid@exemple.com", members: 19, plan: "business", projects: 26, tasks: 908, storageMb: 41000, storageLimitMb: 102400, status: "active", created: daysAgo(87), lastActive: daysAgo(2) },
  { id: "w-freelance", name: "Freelance", ownerName: "Hind Toumi", ownerEmail: "hind@exemple.com", members: 1, plan: "free", projects: 3, tasks: 22, storageMb: 90, storageLimitMb: 1024, status: "active", created: daysAgo(46), lastActive: daysAgo(18) },
  { id: "w-alpha", name: "Projet Alpha", ownerName: "Oussama Fouad", ownerEmail: "oussama@exemple.com", members: 4, plan: "team", projects: 6, tasks: 130, storageMb: 2400, storageLimitMb: 20480, status: "archived", created: daysAgo(210), lastActive: daysAgo(64) },
];

export const SUBSCRIPTIONS: AdminSubscription[] = [
  { id: "s-1", customer: "Sarah Benali", email: "sarah@exemple.com", workspace: "Digital Agency", plan: "pro", status: "active", cycle: "monthly", renews: daysAgo(-12), amount: 29, since: daysAgo(60) },
  { id: "s-2", customer: "Yacine Khelil", email: "yacine@exemple.com", workspace: "Medical Academy", plan: "business", status: "active", cycle: "yearly", renews: daysAgo(-190), amount: 190, since: daysAgo(175) },
  { id: "s-3", customer: "Imane Zeroual", email: "imane@exemple.com", workspace: "E-commerce", plan: "team", status: "past_due", cycle: "monthly", renews: daysAgo(4), amount: 9, since: daysAgo(220) },
  { id: "s-4", customer: "Nadia Chekroun", email: "nadia@exemple.com", workspace: "Marketing 2025", plan: "pro", status: "active", cycle: "monthly", renews: daysAgo(-21), amount: 29, since: daysAgo(95) },
  { id: "s-5", customer: "Lina Haddad", email: "lina@exemple.com", workspace: "Studio Nord", plan: "enterprise", status: "active", cycle: "yearly", renews: daysAgo(-240), amount: 790, since: daysAgo(400) },
  { id: "s-6", customer: "Farid Ouali", email: "farid@exemple.com", workspace: "Consulting Co", plan: "business", status: "active", cycle: "monthly", renews: daysAgo(-8), amount: 19, since: daysAgo(87) },
  { id: "s-7", customer: "Dahlia Meziane", email: "dahlia@exemple.com", workspace: "Product Team", plan: "business", status: "trialing", cycle: "monthly", renews: daysAgo(-3), amount: 19, since: daysAgo(11) },
  { id: "s-8", customer: "Hind Toumi", email: "hind@exemple.com", workspace: "Freelance", plan: "team", status: "trialing", cycle: "monthly", renews: daysAgo(-1), amount: 9, since: daysAgo(13) },
  { id: "s-9", customer: "Rachid Slimani", email: "rachid@exemple.com", workspace: "E-commerce", plan: "team", status: "cancelled", cycle: "monthly", renews: daysAgo(31), amount: 9, since: daysAgo(300) },
  { id: "s-10", customer: "Omar Belkacem", email: "omar@exemple.com", workspace: "Studio Nord", plan: "pro", status: "cancelled", cycle: "monthly", renews: daysAgo(18), amount: 29, since: daysAgo(260) },
];

export const AUDIT: AuditEntry[] = [
  { id: "a-1", admin: "Hakim A.", action: "Suspended a user", target: "rachid@exemple.com", kind: "user", at: daysAgo(0), ip: "41.102.18.44", session: "sess_8f21…c4", result: "success" },
  { id: "a-2", admin: "Hakim A.", action: "Changed a subscription", target: "E-commerce · Team → Business", kind: "subscription", at: daysAgo(0), ip: "41.102.18.44", session: "sess_8f21…c4", result: "success" },
  { id: "a-3", admin: "Amina C.", action: "Edited a plan", target: "Pro · price 25 → 29", kind: "plan", at: daysAgo(1), ip: "197.14.7.201", session: "sess_1a99…7e", result: "success" },
  { id: "a-4", admin: "Amina C.", action: "Granted admin", target: "karim@exemple.com", kind: "permission", at: daysAgo(1), ip: "197.14.7.201", session: "sess_1a99…7e", result: "success" },
  { id: "a-5", admin: "Hakim A.", action: "Deleted a user", target: "spam-signup-4471@mailinator.com", kind: "user", at: daysAgo(2), ip: "41.102.18.44", session: "sess_77b0…19", result: "success" },
  { id: "a-6", admin: "Support bot", action: "Exported user data", target: "Studio Nord", kind: "workspace", at: daysAgo(2), ip: "10.0.4.19", session: "sess_auto…02", result: "denied" },
  { id: "a-7", admin: "Amina C.", action: "Archived a workspace", target: "Projet Alpha", kind: "workspace", at: daysAgo(3), ip: "197.14.7.201", session: "sess_1a99…7e", result: "success" },
  { id: "a-8", admin: "Hakim A.", action: "Refunded a payment", target: "omar@exemple.com · $29", kind: "subscription", at: daysAgo(4), ip: "41.102.18.44", session: "sess_5cc1…aa", result: "failed" },
  { id: "a-9", admin: "System", action: "Rotated storage keys", target: "storage · eu-west", kind: "system", at: daysAgo(5), ip: "10.0.0.2", session: "sess_auto…09", result: "success" },
  { id: "a-10", admin: "Amina C.", action: "Created a plan", target: "Enterprise", kind: "plan", at: daysAgo(7), ip: "197.14.7.201", session: "sess_3d40…b1", result: "success" },
];

export const SERVICES: ServiceStatus[] = [
  { id: "api", name: "API", state: "operational", uptime: "99.99%", detail: "All regions responding", latencyMs: 84 },
  { id: "db", name: "Database", state: "operational", uptime: "99.98%", detail: "Primary and replica in sync", latencyMs: 12 },
  { id: "storage", name: "Storage", state: "degraded", uptime: "99.71%", detail: "Elevated latency in eu-west", latencyMs: 460 },
  { id: "auth", name: "Authentication", state: "operational", uptime: "99.99%", detail: "Sign-in and tokens normal", latencyMs: 96 },
  { id: "jobs", name: "Background jobs", state: "operational", uptime: "99.95%", detail: "Queue depth 12, no retries stuck", latencyMs: 240 },
  { id: "realtime", name: "Realtime", state: "operational", uptime: "99.97%", detail: "4 120 sockets connected", latencyMs: 38 },
];

export const RECENT_ERRORS = [
  { id: "e-1", at: daysAgo(0), service: "storage", message: "PutObject timed out after 30s", count: 14, level: "error" as const },
  { id: "e-2", at: daysAgo(0), service: "api", message: "Rate limit exceeded for workspace w-studio", count: 132, level: "warning" as const },
  { id: "e-3", at: daysAgo(1), service: "jobs", message: "Digest email job retried twice", count: 3, level: "warning" as const },
  { id: "e-4", at: daysAgo(2), service: "db", message: "Statement timeout on report aggregate", count: 1, level: "error" as const },
];

export const TICKETS: SupportTicket[] = [
  { id: "t-1", subject: "Cannot upload files over 20 MB", requester: "Imane Zeroual", workspace: "E-commerce", priority: "urgent", status: "open", opened: daysAgo(0), plan: "team" },
  { id: "t-2", subject: "Request: SSO with Google Workspace", requester: "Lina Haddad", workspace: "Studio Nord", priority: "high", status: "waiting", opened: daysAgo(1), plan: "enterprise" },
  { id: "t-3", subject: "Invoice for March missing", requester: "Farid Ouali", workspace: "Consulting Co", priority: "normal", status: "open", opened: daysAgo(2), plan: "business" },
  { id: "t-4", subject: "Duplicate charge on renewal", requester: "Nadia Chekroun", workspace: "Marketing 2025", priority: "urgent", status: "waiting", opened: daysAgo(3), plan: "pro" },
  { id: "t-5", subject: "How do I export my tasks?", requester: "Hind Toumi", workspace: "Freelance", priority: "normal", status: "resolved", opened: daysAgo(6), plan: "free" },
];

export const ADMIN_ACTIVITY = AUDIT.slice(0, 6);

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

export function formatMoney(value: number): string {
  return `$${value.toLocaleString("en-US")}`;
}

export function formatStorage(mb: number): string {
  if (mb === 0) return "0 MB";
  if (mb < 1024) return `${Math.round(mb)} MB`;
  return `${(mb / 1024).toFixed(mb < 10240 ? 1 : 0)} GB`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function formatWhen(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  return formatDate(iso);
}

/** Days until a date; negative when it has passed. */
export function daysUntil(iso: string): number {
  return Math.round((new Date(iso).getTime() - Date.now()) / DAY);
}
