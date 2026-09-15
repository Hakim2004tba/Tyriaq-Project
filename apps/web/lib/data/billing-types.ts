/**
 * The shape of a plan, and how to write one down.
 *
 * Separate from `billing.ts` because that file reads cookies to find the
 * caller's workspace, which drags `next/headers` into anything importing
 * it — and the billing SCREEN is a client component that needs these
 * types and this formatter. A pure module is the seam.
 */

export interface Plan {
  id: string;
  name: string;
  priceCents: number;
  currency: string;
  cycle: string;
  memberLimit: number | null;
  projectLimit: number | null;
  storageLimitMb: number | null;
  features: string[];
  isPublic: boolean;
}

export interface Usage {
  members: number;
  projects: number;
  storageMb: number;
}

export interface Billing {
  plan: Plan;
  usage: Usage;
  status: "trialing" | "active" | "past_due" | "cancelled" | "none";
  renewsAt: string | null;
  seats: number;
  /** What this workspace has asked for and not yet been moved onto. */
  requestedPlanId: string | null;
}

/** "$9 / month", or "Free". */
export function priceLabel(plan: Plan): string {
  if (plan.priceCents === 0) return "Free";
  const amount = (plan.priceCents / 100).toFixed(plan.priceCents % 100 === 0 ? 0 : 2);
  const symbol = plan.currency === "USD" ? "$" : `${plan.currency} `;
  const per = plan.cycle === "yearly" ? "year" : "month";
  return `${symbol}${amount} / ${per}`;
}
