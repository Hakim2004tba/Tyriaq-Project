"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatCurrencyCompactDA } from "@/lib/format";
import { updateLeadStatus } from "@/lib/actions/leads";
import { LeadCard } from "@/components/dashboard/leads/lead-card";
import { LEAD_STATUSES } from "@/lib/data/operations";
import type { LeadRecord, LeadStatus } from "@/lib/data/operations";

const STAGE_ACCENT: Record<LeadStatus, string> = {
  Nouveau: "bg-stone-400",
  Contacté: "bg-[var(--status-info-fg)]",
  Qualification: "bg-gold-500",
  "Rendez-vous": "bg-accent",
  Devis: "bg-[var(--status-warning-fg)]",
  Négociation: "bg-ink-800",
  Gagné: "bg-[var(--status-success-fg)]",
  Perdu: "bg-[var(--status-danger-fg)]",
};

function PipelineBoard({ leadsByStatus }: { leadsByStatus: Record<LeadStatus, LeadRecord[]> }) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [draggedId, setDraggedId] = React.useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = React.useState<LeadStatus | null>(null);

  function handleDrop(status: LeadStatus) {
    setDragOverStatus(null);
    const leadId = draggedId;
    setDraggedId(null);
    if (!leadId) return;

    const current = LEAD_STATUSES.map((s) => leadsByStatus[s]).flat().find((l) => l.id === leadId);
    if (!current || current.status === status) return;

    startTransition(async () => {
      const result = await updateLeadStatus(leadId, status);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Lead déplacé vers « ${status} »`);
      router.refresh();
    });
  }

  return (
    <div className={cn("flex gap-4 overflow-x-auto pb-4", isPending && "opacity-70")}>
      {LEAD_STATUSES.map((status) => {
        const leads = leadsByStatus[status];
        const totalValue = leads.reduce((sum, l) => sum + l.budget, 0);

        return (
          <div
            key={status}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverStatus(status);
            }}
            onDragLeave={() => setDragOverStatus((s) => (s === status ? null : s))}
            onDrop={(e) => {
              e.preventDefault();
              handleDrop(status);
            }}
            className={cn(
              "flex w-72 shrink-0 flex-col gap-3 rounded-lg border border-border-subtle bg-surface-sunken p-3 transition-colors",
              dragOverStatus === status && "border-accent bg-accent-soft/20",
            )}
          >
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className={cn("h-2 w-2 rounded-full", STAGE_ACCENT[status])} />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-primary">
                  {status}
                </h3>
              </div>
              <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[0.6875rem] font-medium text-text-muted">
                {leads.length}
              </span>
            </div>
            {totalValue > 0 && (
              <p className="px-1 text-[0.6875rem] text-text-muted">
                {formatCurrencyCompactDA(totalValue)} au total
              </p>
            )}

            <div className="flex min-h-16 flex-col gap-2.5">
              {leads.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  dragging={draggedId === lead.id}
                  onDragStart={(e) => {
                    setDraggedId(lead.id);
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", lead.id);
                  }}
                  onDragEnd={() => setDraggedId(null)}
                />
              ))}
              {leads.length === 0 && (
                <p className="rounded-md border border-dashed border-border-default py-6 text-center text-xs text-text-muted">
                  Aucun lead
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { PipelineBoard };
