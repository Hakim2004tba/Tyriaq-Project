"use client";

import Link from "next/link";
import type { DragEvent } from "react";
import { Clock, MapPin } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatCurrencyCompactDA, formatRelativeTime } from "@/lib/format";
import { isFollowUpOverdue } from "@/lib/data/operations";
import type { LeadRecord } from "@/lib/data/operations";

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

function LeadCard({
  lead,
  dragging,
  onDragStart,
  onDragEnd,
}: {
  lead: LeadRecord;
  dragging?: boolean;
  onDragStart?: (event: DragEvent<HTMLDivElement>) => void;
  onDragEnd?: (event: DragEvent<HTMLDivElement>) => void;
}) {
  const overdue = isFollowUpOverdue(lead.nextFollowUpAt);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "group flex cursor-grab flex-col gap-3 rounded-md border border-border-subtle bg-surface-raised p-3.5 shadow-elevation-sm transition-shadow active:cursor-grabbing hover:shadow-elevation-md",
        dragging && "opacity-40",
      )}
    >
      <Link href={`/dashboard/leads/${lead.id}`} className="focus-ring flex flex-col gap-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-[0.5625rem]">{initials(lead.name)}</AvatarFallback>
            </Avatar>
            <p className="text-sm font-medium text-text-primary group-hover:text-text-accent">{lead.name}</p>
          </div>
          <Badge variant="outline">{lead.source}</Badge>
        </div>

        <p className="text-xs text-text-secondary">{lead.projectType}</p>

        <div className="flex items-center justify-between text-xs text-text-muted">
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {lead.city}
          </span>
          <span className="font-medium text-text-primary">{formatCurrencyCompactDA(lead.budget)}</span>
        </div>

        {lead.nextFollowUpAt && (
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-sm px-2 py-1 text-[0.6875rem] font-medium",
              overdue
                ? "bg-[var(--status-danger-bg)] text-[var(--status-danger-fg)]"
                : "bg-surface-sunken text-text-muted",
            )}
          >
            <Clock className="h-3 w-3" />
            {overdue ? "Relance en retard" : "Relance"} {formatRelativeTime(lead.nextFollowUpAt)}
          </div>
        )}
      </Link>
    </div>
  );
}

export { LeadCard };
