import type { JSX } from "react";
import { AdminPage, PageHeader, SampleDataNote } from "@/components/admin/page-header";
import { PlansBoard } from "./plans-board";
import { getAdminOverview } from "@/lib/data/admin";
import { getPlans } from "@/lib/data/billing";
import type { AdminPlan, PlanId } from "@/lib/data/admin-sample";

export const metadata = { title: "Plans" };

export default async function AdminPlansPage(): Promise<JSX.Element> {
  const [plans, overview] = await Promise.all([getPlans(), getAdminOverview()]);

  /*
    Subscriber counts come from the same distribution the overview donut
    draws, so the two screens cannot disagree — which they would the
    moment each counted for itself.
  */
  const subscribers = new Map(
    (overview?.planDistribution ?? []).map((slice) => [slice.plan, slice.count])
  );

  const rows: AdminPlan[] = plans.map((plan) => ({
    id: plan.id as PlanId,
    name: plan.name,
    // The board works in whole currency units; the database keeps minor ones.
    price: Math.round(plan.priceCents / 100),
    cycle: plan.cycle === "yearly" ? "yearly" : "monthly",
    memberLimit: plan.memberLimit,
    storageLimitGb: plan.storageLimitMb === null ? null : Math.round(plan.storageLimitMb / 1024),
    features: plan.features,
    subscribers: subscribers.get(plan.id as PlanId) ?? 0,
  }));

  const total = rows.reduce((sum, plan) => sum + plan.subscribers, 0);

  return (
    <AdminPage>
      <PageHeader
        title="Plans"
        subtitle={`${rows.length} plans · ${total.toLocaleString()} ${
          total === 1 ? "workspace" : "workspaces"
        }`}
      />
      {rows.length === 0 && (
        <SampleDataNote>
          No plans are in the database yet — run supabase/apply-billing.sql.
        </SampleDataNote>
      )}
      <PlansBoard plans={rows} />
    </AdminPage>
  );
}
