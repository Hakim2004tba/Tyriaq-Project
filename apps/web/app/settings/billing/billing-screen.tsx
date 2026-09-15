"use client";

import { useState, useTransition } from "react";
import { Check, CreditCard, Sparkles } from "lucide-react";
import { Badge, Button, Progress, SectionCard, toast } from "@flow/ui";
import { cn } from "@flow/utils";
import { requestPlan } from "@/lib/actions/billing";
import { priceLabel, type Billing, type Plan } from "@/lib/data/billing-types";

/**
 * Plan, usage, and the way to a bigger one.
 *
 * Usage sits above the plans rather than below them, because "you are
 * using 3 of 3 seats" is the reason somebody came to this screen, and
 * the plans underneath are the answer to it.
 *
 * Nothing here takes a payment. Tyriaq has no provider yet — Stripe does
 * not operate in Algeria — so Upgrade records the request and tells
 * whoever runs Tyriaq, and the screen says exactly that rather than
 * pretending a card form is coming.
 */
export function BillingScreen({
  billing,
  plans,
  workspaceName,
  canManage,
}: {
  billing: Billing | null;
  plans: Plan[];
  workspaceName: string;
  canManage: boolean;
}) {
  const [requested, setRequested] = useState(billing?.requestedPlanId ?? null);
  const [pending, startTransition] = useTransition();

  if (!billing) {
    return (
      <div className="mx-auto max-w-[900px] px-4 py-6 sm:px-6 lg:px-8">
        <p className="text-body text-text-secondary">No workspace selected.</p>
      </div>
    );
  }

  const { plan, usage } = billing;

  function ask(target: Plan) {
    startTransition(async () => {
      const result = await requestPlan(target.id, "");
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setRequested(target.id);
      toast.success(result.message ?? "Request sent.");
    });
  }

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header>
        <h1 className="text-h1 text-text-primary">Plan &amp; billing</h1>
        <p className="mt-1.5 text-body text-text-secondary">
          {workspaceName} is on <span className="text-text-primary">{plan.name}</span>
          {billing.status === "trialing" && " — trial"}
          {billing.status === "past_due" && " — payment overdue"}
          {billing.renewsAt && `, renewing ${new Date(billing.renewsAt).toLocaleDateString()}`}.
        </p>
      </header>

      <SectionCard title="What you are using" subtitle="Against the limits of your plan">
        <ul className="grid gap-4 sm:grid-cols-3">
          <Meter label="People" used={usage.members} limit={plan.memberLimit} unit="" />
          <Meter label="Projects" used={usage.projects} limit={plan.projectLimit} unit="" />
          <Meter
            label="Files"
            used={Math.round(usage.storageMb)}
            limit={plan.storageLimitMb}
            unit=" MB"
          />
        </ul>
      </SectionCard>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((item) => {
          const current = item.id === plan.id;
          const asked = requested === item.id;
          return (
            <div
              key={item.id}
              className={cn(
                "flex flex-col gap-3 rounded-lg border bg-surface p-4",
                current ? "border-primary/60 shadow-glow-sm" : "border-border"
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-h4 text-text-primary">{item.name}</p>
                {current && <Badge variant="primary" size="sm">Current</Badge>}
              </div>
              <p className="text-body-sm text-text-secondary">{priceLabel(item)}</p>

              <ul className="flex flex-1 flex-col gap-1.5">
                {item.features.map((feature) => (
                  <li key={feature} className="flex gap-1.5 text-caption text-text-muted">
                    <Check className="mt-0.5 size-3 shrink-0 text-success" aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>

              {current ? (
                <Button variant="secondary" size="sm" disabled>
                  You are here
                </Button>
              ) : asked ? (
                <Button variant="secondary" size="sm" disabled>
                  Requested
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant={item.priceCents > plan.priceCents ? "primary" : "secondary"}
                  loading={pending}
                  disabled={!canManage}
                  onClick={() => ask(item)}
                >
                  {item.priceCents > plan.priceCents ? "Upgrade" : "Switch"}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/*
        Said plainly rather than hidden.

        A pricing page with an Upgrade button that quietly does nothing is
        worse than one that explains why it cannot charge yet — and the
        people reading this are the ones who would rather pay by transfer
        anyway.
      */}
      <SectionCard title="How payment works today" subtitle="Honestly: by conversation">
        <div className="flex flex-col gap-2 text-body-sm text-text-secondary">
          <p className="flex items-start gap-2">
            <CreditCard className="mt-0.5 size-4 shrink-0 text-text-muted" aria-hidden="true" />
            <span>
              Tyriaq has no card payments yet. Pressing Upgrade records what you want and tells us;
              we arrange payment with you directly and move the workspace over.
            </span>
          </p>
          <p className="flex items-start gap-2">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-text-muted" aria-hidden="true" />
            <span>Nothing changes on your workspace until then, and nothing is charged.</span>
          </p>
        </div>
      </SectionCard>

      {!canManage && (
        <p className="text-caption text-text-muted">
          Only an owner or admin can change the plan.
        </p>
      )}
    </div>
  );
}

/**
 * One usage bar.
 *
 * An unlimited allowance draws no bar at all: a progress bar with no end
 * is a decoration, and reading "12 of unlimited" as 0% is worse than
 * reading nothing.
 */
function Meter({
  label,
  used,
  limit,
  unit,
}: {
  label: string;
  used: number;
  limit: number | null;
  unit: string;
}) {
  const share = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const full = limit !== null && used >= limit;

  return (
    <li className="flex flex-col gap-1.5">
      <p className="flex items-baseline justify-between gap-2">
        <span className="text-body-sm text-text-primary">{label}</span>
        <span className={cn("text-caption tabular", full ? "text-warning" : "text-text-muted")}>
          {used}
          {unit} {limit === null ? "· unlimited" : `of ${limit}${unit}`}
        </span>
      </p>
      {limit !== null && <Progress value={share} label={`${label} used`} />}
    </li>
  );
}
