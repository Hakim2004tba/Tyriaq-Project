"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { StickyNote, Phone, CalendarClock, CheckSquare, BellRing } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatShortDate, formatRelativeTime } from "@/lib/format";
import { toggleInteractionDone } from "@/lib/actions/leads";
import { isFollowUpOverdue } from "@/lib/data/operations";
import type { MyInteraction } from "@/lib/data/personal";
import type { LeadInteractionType } from "@/lib/data/operations";

const TYPE_META: Record<LeadInteractionType, { label: string; icon: typeof StickyNote }> = {
  note: { label: "Note", icon: StickyNote },
  call: { label: "Appel", icon: Phone },
  appointment: { label: "Rendez-vous", icon: CalendarClock },
  task: { label: "Tâche", icon: CheckSquare },
  reminder: { label: "Rappel", icon: BellRing },
};

function SuiviItem({ item }: { item: MyInteraction }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const Icon = TYPE_META[item.type].icon;
  const overdue = isFollowUpOverdue(item.dueDate);
  const isActionable = item.type === "task" || item.type === "reminder";

  async function handleToggle() {
    setPending(true);
    const result = await toggleInteractionDone(item.id);
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-start gap-3 border-b border-border-subtle py-4 last:border-0">
      {isActionable ? (
        <Checkbox checked={item.completed} disabled={pending} onCheckedChange={handleToggle} className="mt-1" />
      ) : (
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-text-secondary">
          <Icon className="h-3.5 w-3.5" />
        </span>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/dashboard/leads/${item.leadId}`} className="text-sm font-medium text-text-primary hover:text-text-accent">
            {item.title}
          </Link>
          <Badge variant="outline">{TYPE_META[item.type].label}</Badge>
          {item.outcome && <Badge variant="info">{item.outcome}</Badge>}
        </div>
        {item.content && <p className="mt-1 text-sm text-text-secondary">{item.content}</p>}
        <p className="mt-1 text-xs text-text-muted">
          Lead : <Link href={`/dashboard/leads/${item.leadId}`} className="hover:text-text-primary">{item.leadName}</Link>
        </p>
      </div>

      <div className="shrink-0 text-right">
        {item.dueDate ? (
          <p className={cn("text-xs", overdue && !item.completed ? "font-medium text-[var(--status-danger-fg)]" : "text-text-muted")}>
            {formatShortDate(item.dueDate)}
          </p>
        ) : (
          <p className="text-xs text-text-muted">{formatRelativeTime(item.createdAt)}</p>
        )}
      </div>
    </div>
  );
}

export { SuiviItem, TYPE_META };
