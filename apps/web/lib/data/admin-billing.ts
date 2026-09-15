import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminSubscription, PlanId, SubscriptionStatus } from "./admin-sample";

/**
 * Real subscriptions, for the back office.
 *
 * Needs the service-role client: this reads across every workspace, so
 * it cannot act as any one person. The route that renders it is behind
 * `requirePlatformAdmin()` — without that gate this function would hand
 * every customer's billing to every signed-in user, which is why the
 * role was added before the query.
 *
 * Returns null when the key is absent, so a deployment without it shows
 * the sample data it always did rather than an error page.
 */
export async function getRealSubscriptions(): Promise<AdminSubscription[] | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("workspace_subscriptions")
    .select(
      "workspace_id, plan_id, status, seats, started_at, renews_at, workspaces(name, created_by), plans(name, price_cents, cycle)"
    )
    .order("started_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[tyriaq] admin could not read subscriptions:", error);
    return null;
  }

  type Row = {
    workspace_id: string; plan_id: string; status: string; seats: number;
    started_at: string; renews_at: string | null;
    workspaces: { name: string; created_by: string } | null;
    plans: { name: string; price_cents: number; cycle: string } | null;
  };

  const rows = (data ?? []) as unknown as Row[];
  if (rows.length === 0) return [];

  /*
    The owner's address comes from auth.users, one call each.

    Two hundred round trips would be unacceptable on a hot path; this is
    a back-office table nobody loads in a loop, and the alternative —
    denormalising an email into the subscription — is a copy that goes
    stale the first time somebody changes their address.
  */
  const owners = new Map<string, string>();
  for (const row of rows) {
    const id = row.workspaces?.created_by;
    if (!id || owners.has(id)) continue;
    const { data: account } = await supabase.auth.admin.getUserById(id);
    owners.set(id, account?.user?.email ?? "");
  }

  return rows.map((row) => ({
    id: row.workspace_id,
    customer: row.workspaces?.name ?? "Unknown workspace",
    email: owners.get(row.workspaces?.created_by ?? "") ?? "",
    workspace: row.workspaces?.name ?? "—",
    plan: row.plan_id as PlanId,
    status: row.status as SubscriptionStatus,
    cycle: row.plans?.cycle === "yearly" ? "yearly" : "monthly",
    renews: row.renews_at ?? row.started_at,
    // The table works in whole units; the database keeps minor ones.
    amount: Math.round((row.plans?.price_cents ?? 0) / 100) * Math.max(row.seats, 1),
    since: row.started_at,
  }));
}
