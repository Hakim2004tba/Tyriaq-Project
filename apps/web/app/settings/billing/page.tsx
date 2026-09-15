import type { JSX } from "react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { getCurrentWorkspace } from "@/lib/data/queries";
import { getBilling, getPlans } from "@/lib/data/billing";
import { BillingScreen } from "./billing-screen";

export const metadata: Metadata = {
  title: "Plan & billing",
  description: "What this workspace is on, and what it is using.",
};

export default async function BillingPage(): Promise<JSX.Element> {
  await requireUser();
  const [billing, plans, workspace] = await Promise.all([
    getBilling(),
    getPlans(),
    getCurrentWorkspace(),
  ]);

  return (
    <BillingScreen
      billing={billing}
      plans={plans}
      workspaceName={workspace?.name ?? "This workspace"}
      canManage={workspace?.role === "owner" || workspace?.role === "admin"}
    />
  );
}
