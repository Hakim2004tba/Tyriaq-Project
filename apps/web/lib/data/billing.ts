import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { reportReadError } from "./report";
import { getCurrentWorkspace } from "./queries";
import type { Billing, Plan } from "./billing-types";

/**
 * What a workspace is on, and what it is using.
 *
 * Read in one place because three screens need the same answer — the
 * billing page, the sidebar's upgrade card, and every action that has to
 * refuse a fourth project.
 */

const FREE: Plan = {
  id: "free",
  name: "Free",
  priceCents: 0,
  currency: "USD",
  cycle: "monthly",
  memberLimit: 3,
  projectLimit: 2,
  storageLimitMb: 1024,
  features: [],
  isPublic: true,
};

type PlanRow = {
  id: string; name: string; price_cents: number; currency: string; cycle: string;
  member_limit: number | null; project_limit: number | null; storage_limit_mb: number | null;
  features: string[] | null; is_public: boolean;
};

function toPlan(row: PlanRow): Plan {
  return {
    id: row.id,
    name: row.name,
    priceCents: row.price_cents,
    currency: row.currency,
    cycle: row.cycle,
    memberLimit: row.member_limit,
    projectLimit: row.project_limit,
    storageLimitMb: row.storage_limit_mb,
    features: row.features ?? [],
    isPublic: row.is_public,
  };
}

/** Every plan worth showing somebody, cheapest first. */
export const getPlans = cache(async (): Promise<Plan[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plans")
    .select("*")
    .eq("is_public", true)
    .order("position", { ascending: true });
  reportReadError("getPlans", error);
  return ((data ?? []) as PlanRow[]).map(toPlan);
});

export const getBilling = cache(async (): Promise<Billing | null> => {
  const ws = await getCurrentWorkspace();
  if (!ws) return null;

  const supabase = await createClient();

  const [{ data: planRow }, { data: usageRow }, { data: subscription }, { data: events }] =
    await Promise.all([
      supabase.rpc("workspace_plan", { p_workspace: ws.id }).maybeSingle(),
      supabase.rpc("workspace_usage", { p_workspace: ws.id }).maybeSingle(),
      supabase
        .from("workspace_subscriptions")
        .select("status, renews_at, seats, plan_id")
        .eq("workspace_id", ws.id)
        .maybeSingle(),
      // The most recent request, so the page can say "we have your
      // request" rather than offering the same button again.
      supabase
        .from("billing_events")
        .select("plan_id, kind, created_at")
        .eq("workspace_id", ws.id)
        .eq("kind", "requested")
        .order("created_at", { ascending: false })
        .limit(1),
    ]);

  const plan = planRow ? toPlan(planRow as PlanRow) : FREE;
  const usage = (usageRow ?? { members: 1, projects: 0, storage_mb: 0 }) as {
    members: number; projects: number; storage_mb: number;
  };
  const sub = subscription as
    | { status: Billing["status"]; renews_at: string | null; seats: number; plan_id: string }
    | null;

  const requested = (events ?? [])[0] as { plan_id: string | null } | undefined;

  return {
    plan,
    usage: {
      members: usage.members,
      projects: usage.projects,
      storageMb: Number(usage.storage_mb ?? 0),
    },
    status: sub?.status ?? "none",
    renewsAt: sub?.renews_at ?? null,
    seats: sub?.seats ?? 1,
    // A request for the plan they are already on is not outstanding.
    requestedPlanId:
      requested?.plan_id && requested.plan_id !== plan.id ? requested.plan_id : null,
  };
});


export type { Billing, Plan, Usage } from "./billing-types";
