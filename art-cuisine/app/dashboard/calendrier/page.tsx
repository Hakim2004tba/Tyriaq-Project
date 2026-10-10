import Link from "next/link";
import { CalendarClock, CheckSquare, BellRing, FileText } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { getOwnerScope } from "@/lib/data/scope";
import { getMyAgenda, type AgendaEntry } from "@/lib/data/personal";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { isOverdue } from "@/lib/data/metrics";
import { cn } from "@/lib/utils";

const KIND_ICON: Record<AgendaEntry["kind"], typeof CalendarClock> = {
  "Rendez-vous": CalendarClock,
  Tâche: CheckSquare,
  Rappel: BellRing,
  Devis: FileText,
};

const KIND_BADGE: Record<AgendaEntry["kind"], "gold" | "warning" | "info" | "neutral"> = {
  "Rendez-vous": "gold",
  Tâche: "warning",
  Rappel: "info",
  Devis: "neutral",
};

function formatDayHeading(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  if (isSameDay(date, today)) return "Aujourd'hui";
  if (isSameDay(date, tomorrow)) return "Demain";

  return date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

function groupByDay(entries: AgendaEntry[]): { day: string; heading: string; items: AgendaEntry[] }[] {
  const groups = new Map<string, AgendaEntry[]>();
  for (const entry of entries) {
    const day = entry.date.slice(0, 10);
    if (!groups.has(day)) groups.set(day, []);
    groups.get(day)!.push(entry);
  }
  return Array.from(groups.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, items]) => ({ day, heading: formatDayHeading(items[0].date), items }));
}

export default async function CalendrierPage() {
  const user = await requirePermission("leads.manage");
  const scope = getOwnerScope(user);

  const agenda = await getMyAgenda(scope);
  const overdue = agenda.filter((a) => isOverdue(a.date));
  const upcoming = agenda.filter((a) => !isOverdue(a.date));
  const groups = groupByDay(upcoming);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-medium text-text-primary sm:text-3xl">
          Calendrier
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          {scope
            ? "Vos rendez-vous, tâches, rappels et échéances de devis à venir."
            : "Les rendez-vous, tâches, rappels et échéances de devis de toute l'équipe."}
        </p>
      </div>

      {overdue.length > 0 && (
        <Card className="border-[var(--status-danger-fg)]/30 bg-[var(--status-danger-bg)] px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--status-danger-fg)]">
            En retard ({overdue.length})
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {overdue.map((entry) => {
              const Icon = KIND_ICON[entry.kind];
              return (
                <Link
                  key={entry.id}
                  href={entry.href}
                  className="flex items-center gap-3 rounded-md bg-surface-raised px-3 py-2.5 text-sm hover:opacity-80"
                >
                  <Icon className="h-4 w-4 shrink-0 text-[var(--status-danger-fg)]" />
                  <span className="min-w-0 flex-1 truncate font-medium text-text-primary">{entry.title}</span>
                  <span className="shrink-0 text-xs text-text-muted">{entry.subtitle}</span>
                </Link>
              );
            })}
          </div>
        </Card>
      )}

      {groups.length === 0 && overdue.length === 0 && (
        <Card className="px-6 py-16 text-center text-sm text-text-muted">
          Rien de prévu pour le moment. 🎉
        </Card>
      )}

      {groups.map((group) => (
        <Card key={group.day} className="overflow-hidden">
          <div className="border-b border-border-subtle bg-surface-sunken px-6 py-3">
            <p className="text-sm font-semibold capitalize text-text-primary">{group.heading}</p>
          </div>
          <div className="flex flex-col px-6">
            {group.items.map((entry) => {
              const Icon = KIND_ICON[entry.kind];
              return (
                <Link
                  key={entry.id}
                  href={entry.href}
                  className="flex items-center gap-3 border-b border-border-subtle py-3.5 last:border-0 hover:opacity-80"
                >
                  <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-text-secondary")}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text-primary">{entry.title}</p>
                    <p className="text-xs text-text-muted">{entry.subtitle}</p>
                  </div>
                  <Badge variant={KIND_BADGE[entry.kind]}>{entry.kind}</Badge>
                </Link>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}
