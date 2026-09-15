import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  AdminUser,
  AdminWorkspace,
  AuditEntry,
  PlanId,
  SupportTicket,
} from "./admin-sample";

/**
 * The back office, over real data.
 *
 * Every function here uses the service-role client, because the back
 * office is the one place that reads ACROSS workspaces — it cannot act
 * as any one person. The route is behind `requirePlatformAdmin()`, which
 * is what makes that safe; without the gate these functions would hand
 * every customer's data to any signed-in user.
 *
 * Each returns `null` when the key is missing, so a deployment without
 * it falls back to the sample data the panel has always drawn rather
 * than showing an error.
 *
 * These are deliberately plain. A back office is read by a handful of
 * people a few times a day; the queries are allowed to be obvious.
 */

/** How many rows any one admin table will draw before it stops. */
const CAP = 200;

type Client = NonNullable<ReturnType<typeof createAdminClient>>;

/** Addresses live in auth.users, which no ordinary query can join to. */
async function emailsOf(supabase: Client, ids: string[]): Promise<Map<string, string>> {
  const found = new Map<string, string>();
  /*
    One page of up to a thousand accounts rather than a lookup each.
    `getUserById` in a loop is a round trip per person, which on the
    Users page is the difference between one request and two hundred.
  */
  const { data } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  for (const account of data?.users ?? []) {
    if (account.email) found.set(account.id, account.email);
  }
  // Anybody beyond the first page is looked up individually.
  for (const id of ids) {
    if (found.has(id)) continue;
    const { data: one } = await supabase.auth.admin.getUserById(id);
    if (one?.user?.email) found.set(id, one.user.email);
  }
  return found;
}

async function planByWorkspace(supabase: Client): Promise<Map<string, PlanId>> {
  const { data } = await supabase
    .from("workspace_subscriptions")
    .select("workspace_id, plan_id, status");
  const map = new Map<string, PlanId>();
  for (const row of (data ?? []) as { workspace_id: string; plan_id: string; status: string }[]) {
    // A cancelled subscription is a workspace on Free, which is what
    // `workspace_plan()` says too — the two must not disagree.
    if (row.status === "active" || row.status === "trialing") {
      map.set(row.workspace_id, row.plan_id as PlanId);
    }
  }
  return map;
}

/* ------------------------------------------------------------------ */
/* Users                                                               */
/* ------------------------------------------------------------------ */

export async function getAdminUsers(): Promise<AdminUser[] | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const [{ data: profiles }, { data: memberships }, { data: tasks }, { data: files }] =
    await Promise.all([
      supabase.from("profiles").select("id, full_name, created_at").limit(CAP),
      supabase.from("workspace_members").select("user_id, workspace_id, role, workspaces(name)"),
      supabase.from("tasks").select("created_by"),
      supabase.from("task_attachments").select("uploaded_by, size_bytes"),
    ]);

  const rows = (profiles ?? []) as { id: string; full_name: string; created_at: string }[];
  if (rows.length === 0) return [];

  const emails = await emailsOf(supabase, rows.map((row) => row.id));
  const plans = await planByWorkspace(supabase);

  const membership = new Map<string, { workspaceId: string; name: string; role: string }>();
  for (const row of (memberships ?? []) as unknown as {
    user_id: string; workspace_id: string; role: string; workspaces: { name: string } | null;
  }[]) {
    // The first workspace somebody is in is the one the table shows;
    // people in several are rare and the column has room for one.
    if (!membership.has(row.user_id)) {
      membership.set(row.user_id, {
        workspaceId: row.workspace_id,
        name: row.workspaces?.name ?? "—",
        role: row.role,
      });
    }
  }

  const taskCount = new Map<string, number>();
  for (const row of (tasks ?? []) as { created_by: string }[]) {
    taskCount.set(row.created_by, (taskCount.get(row.created_by) ?? 0) + 1);
  }

  const bytes = new Map<string, number>();
  for (const row of (files ?? []) as { uploaded_by: string; size_bytes: number }[]) {
    bytes.set(row.uploaded_by, (bytes.get(row.uploaded_by) ?? 0) + Number(row.size_bytes ?? 0));
  }

  const { data: accounts } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const lastSeen = new Map<string, string>();
  const banned = new Set<string>();
  for (const account of accounts?.users ?? []) {
    lastSeen.set(account.id, account.last_sign_in_at ?? account.created_at);
    // Supabase records a ban as a future timestamp rather than a flag.
    const until = (account as { banned_until?: string }).banned_until;
    if (until && new Date(until) > new Date()) banned.add(account.id);
  }

  return rows.map((row) => {
    const where = membership.get(row.id);
    return {
      id: row.id,
      name: row.full_name || "Unnamed",
      email: emails.get(row.id) ?? "",
      workspace: where?.name ?? "No workspace",
      workspaceId: where?.workspaceId ?? "",
      plan: (where ? plans.get(where.workspaceId) : undefined) ?? "free",
      status: banned.has(row.id) ? "suspended" : where ? "active" : "invited",
      role: (where?.role as AdminUser["role"]) ?? "member",
      joined: row.created_at,
      lastActive: lastSeen.get(row.id) ?? row.created_at,
      // Not collected. Inventing one would put a flag on a table that
      // means nothing.
      country: "—",
      tasksCreated: taskCount.get(row.id) ?? 0,
      storageMb: Math.round((bytes.get(row.id) ?? 0) / 1048576),
    };
  });
}

/* ------------------------------------------------------------------ */
/* Workspaces                                                          */
/* ------------------------------------------------------------------ */

export async function getAdminWorkspaces(): Promise<AdminWorkspace[] | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const [{ data: workspaces }, { data: members }, { data: projects }, { data: tasks }, { data: files }, { data: plans }] =
    await Promise.all([
      supabase.from("workspaces").select("id, name, created_by, created_at, updated_at").limit(CAP),
      supabase.from("workspace_members").select("workspace_id, user_id"),
      supabase.from("projects").select("workspace_id, archived_at"),
      supabase.from("tasks").select("workspace_id, updated_at"),
      supabase.from("task_attachments").select("workspace_id, size_bytes"),
      supabase.from("plans").select("id, storage_limit_mb"),
    ]);

  const rows = (workspaces ?? []) as {
    id: string; name: string; created_by: string; created_at: string; updated_at: string;
  }[];
  if (rows.length === 0) return [];

  const emails = await emailsOf(supabase, rows.map((row) => row.created_by));
  const planOf = await planByWorkspace(supabase);

  const { data: owners } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", rows.map((row) => row.created_by));
  const ownerName = new Map(
    ((owners ?? []) as { id: string; full_name: string }[]).map((row) => [row.id, row.full_name])
  );

  const count = <T extends { workspace_id: string }>(list: T[] | null, keep?: (row: T) => boolean) => {
    const map = new Map<string, number>();
    for (const row of list ?? []) {
      if (keep && !keep(row)) continue;
      map.set(row.workspace_id, (map.get(row.workspace_id) ?? 0) + 1);
    }
    return map;
  };

  const memberCount = count((members ?? []) as { workspace_id: string }[]);
  const projectCount = count(
    (projects ?? []) as { workspace_id: string; archived_at: string | null }[],
    (row) => row.archived_at === null
  );
  const taskCount = count((tasks ?? []) as { workspace_id: string }[]);

  const bytes = new Map<string, number>();
  const touched = new Map<string, string>();
  for (const row of (files ?? []) as { workspace_id: string; size_bytes: number }[]) {
    bytes.set(row.workspace_id, (bytes.get(row.workspace_id) ?? 0) + Number(row.size_bytes ?? 0));
  }
  for (const row of (tasks ?? []) as { workspace_id: string; updated_at: string }[]) {
    const seen = touched.get(row.workspace_id);
    if (!seen || row.updated_at > seen) touched.set(row.workspace_id, row.updated_at);
  }

  const storageLimit = new Map(
    ((plans ?? []) as { id: string; storage_limit_mb: number | null }[]).map((row) => [
      row.id,
      row.storage_limit_mb,
    ])
  );

  return rows.map((row) => {
    const plan = planOf.get(row.id) ?? "free";
    const usedMb = Math.round((bytes.get(row.id) ?? 0) / 1048576);
    const limitMb = storageLimit.get(plan) ?? 1024;
    return {
      id: row.id,
      name: row.name,
      ownerName: ownerName.get(row.created_by) || "Unknown",
      ownerEmail: emails.get(row.created_by) ?? "",
      members: memberCount.get(row.id) ?? 0,
      plan,
      projects: projectCount.get(row.id) ?? 0,
      tasks: taskCount.get(row.id) ?? 0,
      storageMb: usedMb,
      storageLimitMb: limitMb ?? 0,
      // "Over limit" is a real state worth seeing in a list, not a
      // decoration: it is the workspace that will complain next.
      status: limitMb !== null && usedMb > limitMb ? "over_limit" : "active",
      created: row.created_at,
      lastActive: touched.get(row.id) ?? row.updated_at,
    };
  });
}

/* ------------------------------------------------------------------ */
/* The headline numbers                                                */
/* ------------------------------------------------------------------ */

export interface AdminOverview {
  totalUsers: number;
  activeUsers: number;
  workspaces: number;
  subscriptions: number;
  /** Monthly recurring revenue, in whole currency units. */
  mrr: number;
  newUsers: number;
  churned: number;
  /** Cumulative counts by day, oldest first. */
  userSeries: { date: string; value: number }[];
  workspaceSeries: { date: string; value: number }[];
  planDistribution: { plan: PlanId; count: number }[];
}

export async function getAdminOverview(days = 30): Promise<AdminOverview | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const [{ data: profiles }, { data: workspaces }, { data: subs }, { data: plans }] =
    await Promise.all([
      supabase.from("profiles").select("id, created_at"),
      supabase.from("workspaces").select("id, created_at"),
      supabase.from("workspace_subscriptions").select("plan_id, status, seats"),
      supabase.from("plans").select("id, price_cents, cycle"),
    ]);

  const { data: accounts } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceIso = since.toISOString();

  const price = new Map(
    ((plans ?? []) as { id: string; price_cents: number; cycle: string }[]).map((row) => [
      row.id,
      row.cycle === "yearly" ? row.price_cents / 12 : row.price_cents,
    ])
  );

  const subscriptions = (subs ?? []) as { plan_id: string; status: string; seats: number }[];
  const live = subscriptions.filter((row) => row.status === "active" || row.status === "trialing");

  const distribution = new Map<PlanId, number>();
  let mrrCents = 0;
  for (const row of live) {
    distribution.set(row.plan_id as PlanId, (distribution.get(row.plan_id as PlanId) ?? 0) + 1);
    mrrCents += (price.get(row.plan_id) ?? 0) * Math.max(row.seats, 1);
  }

  /*
    Every workspace with no subscription row is on Free, and the plan
    donut would be wrong without them — most of the platform is on Free
    precisely because it has never been asked to pay.
  */
  const paid = new Set(live.map((row) => row.plan_id));
  const freeCount = (workspaces ?? []).length - live.length;
  if (freeCount > 0) distribution.set("free", (distribution.get("free") ?? 0) + freeCount);
  void paid;

  /** Running total per day, which is what a growth line means. */
  const cumulative = (rows: { created_at: string }[]) => {
    const perDay = new Map<string, number>();
    for (const row of rows) {
      const day = row.created_at.slice(0, 10);
      perDay.set(day, (perDay.get(day) ?? 0) + 1);
    }
    const series: { date: string; value: number }[] = [];
    let running = rows.filter((row) => row.created_at < sinceIso).length;
    const cursor = new Date(since);
    for (let i = 0; i <= days; i++) {
      const day = cursor.toISOString().slice(0, 10);
      running += perDay.get(day) ?? 0;
      series.push({ date: day, value: running });
      cursor.setDate(cursor.getDate() + 1);
    }
    return series;
  };

  const people = (profiles ?? []) as { id: string; created_at: string }[];
  const activeWindow = new Date();
  activeWindow.setDate(activeWindow.getDate() - 30);
  const active = (accounts?.users ?? []).filter(
    (account) => account.last_sign_in_at && new Date(account.last_sign_in_at) > activeWindow
  ).length;

  return {
    totalUsers: people.length,
    activeUsers: active,
    workspaces: (workspaces ?? []).length,
    subscriptions: live.length,
    mrr: Math.round(mrrCents / 100),
    newUsers: people.filter((row) => row.created_at >= sinceIso).length,
    churned: subscriptions.filter((row) => row.status === "cancelled").length,
    userSeries: cumulative(people),
    workspaceSeries: cumulative((workspaces ?? []) as { created_at: string }[]),
    planDistribution: Array.from(distribution.entries()).map(([plan, count]) => ({ plan, count })),
  };
}

/* ------------------------------------------------------------------ */
/* Audit, support, settings                                            */
/* ------------------------------------------------------------------ */

export async function getAdminAudit(): Promise<AuditEntry[] | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("admin_audit")
    .select("id, action, kind, target, result, detail, created_at, profiles(full_name)")
    .order("created_at", { ascending: false })
    .limit(CAP);

  const rows = (data ?? []) as unknown as {
    id: string; action: string; kind: AuditEntry["kind"]; target: string | null;
    result: AuditEntry["result"]; detail: string | null; created_at: string;
    profiles: { full_name: string } | null;
  }[];

  return rows.map((row) => ({
    id: row.id,
    admin: row.profiles?.full_name || "System",
    action: row.action,
    target: row.target ?? "—",
    kind: row.kind,
    at: row.created_at,
    // Not recorded. A column showing a made-up address on an audit
    // screen is worse than an empty one.
    ip: "—",
    session: row.detail ?? "—",
    result: row.result,
  }));
}

export async function getAdminTickets(): Promise<SupportTicket[] | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("support_tickets")
    .select("id, subject, priority, status, created_at, workspace_id, opened_by, workspaces(name), profiles!opened_by(full_name)")
    .order("created_at", { ascending: false })
    .limit(CAP);

  const rows = (data ?? []) as unknown as {
    id: string; subject: string; priority: SupportTicket["priority"];
    status: SupportTicket["status"]; created_at: string; workspace_id: string | null;
    workspaces: { name: string } | null;
    profiles: { full_name: string } | null;
  }[];
  if (rows.length === 0) return [];

  const planOf = await planByWorkspace(supabase);

  return rows.map((row) => ({
    id: row.id,
    subject: row.subject,
    requester: row.profiles?.full_name || "Unknown",
    workspace: row.workspaces?.name ?? "—",
    priority: row.priority,
    status: row.status,
    opened: row.created_at,
    plan: (row.workspace_id ? planOf.get(row.workspace_id) : undefined) ?? "free",
  }));
}

export interface PlatformSettings {
  signupsOpen: boolean;
  supportEmail: string;
  announcement: string;
}

export async function getPlatformSettings(): Promise<PlatformSettings | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const { data } = await supabase.from("platform_settings").select("key, value");
  const map = new Map(((data ?? []) as { key: string; value: unknown }[]).map((row) => [row.key, row.value]));

  return {
    signupsOpen: map.get("signups_open") !== false,
    supportEmail: typeof map.get("support_email") === "string" ? (map.get("support_email") as string) : "",
    announcement: typeof map.get("announcement") === "string" ? (map.get("announcement") as string) : "",
  };
}

/* ------------------------------------------------------------------ */
/* System                                                              */
/* ------------------------------------------------------------------ */

export interface SystemHealth {
  databaseReachable: boolean;
  latencyMs: number;
  rows: { table: string; count: number }[];
  storageMb: number;
  mailConfigured: boolean;
  serviceRoleConfigured: boolean;
  cronConfigured: boolean;
}

/**
 * What can actually be measured from here.
 *
 * Not uptime percentages or CPU graphs — this process has no way to know
 * either, and a dial reading "99.98%" because somebody typed it is worse
 * than no dial. What it CAN answer: is the database reachable, how long
 * did that take, how much is in it, and which of the optional pieces are
 * configured.
 */
export async function getSystemHealth(): Promise<SystemHealth | null> {
  const supabase = createAdminClient();
  if (!supabase) {
    return {
      databaseReachable: false,
      latencyMs: 0,
      rows: [],
      storageMb: 0,
      mailConfigured: Boolean(process.env.RESEND_API_KEY),
      serviceRoleConfigured: false,
      cronConfigured: Boolean(process.env.CRON_SECRET),
    };
  }

  const started = Date.now();
  const tables = ["profiles", "workspaces", "projects", "tasks", "documents", "messages"];
  const counts = await Promise.all(
    tables.map(async (table) => {
      const { count } = await supabase.from(table).select("*", { count: "exact", head: true });
      return { table, count: count ?? 0 };
    })
  );
  const latencyMs = Date.now() - started;

  const { data: files } = await supabase.from("task_attachments").select("size_bytes");
  const storageMb =
    Math.round(
      ((files ?? []) as { size_bytes: number }[]).reduce(
        (total, row) => total + Number(row.size_bytes ?? 0),
        0
      ) / 1048576
    );

  return {
    databaseReachable: true,
    latencyMs,
    rows: counts,
    storageMb,
    mailConfigured: Boolean(process.env.RESEND_API_KEY),
    serviceRoleConfigured: true,
    cronConfigured: Boolean(process.env.CRON_SECRET),
  };
}
