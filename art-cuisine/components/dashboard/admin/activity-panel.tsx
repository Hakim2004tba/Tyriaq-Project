import { History, FileText, Headset, FolderKanban, Wallet, Target, Users, Factory, Paintbrush, Wrench } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/format";
import { getRecentActivity, type PeriodKey } from "@/lib/data/metrics";
import type { ActivityCategory } from "@/lib/data/operations";

const CATEGORY_ICON: Record<ActivityCategory, typeof History> = {
  lead: Target,
  devis: FileText,
  projet: FolderKanban,
  paiement: Wallet,
  sav: Headset,
  client: Users,
  production: Factory,
  vernissage: Paintbrush,
  montage: Wrench,
};

function ActivityPanel({ period }: { period: PeriodKey }) {
  const activity = getRecentActivity(period, 10);

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-accent-strong">
          <History className="h-5 w-5" />
        </span>
        <div>
          <CardTitle>Activité récente</CardTitle>
          <CardDescription>Le journal des événements sur la période sélectionnée.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ol className="flex flex-col">
          {activity.length === 0 && (
            <li className="px-6 py-8 text-center text-sm text-text-muted">
              Aucune activité sur cette période.
            </li>
          )}
          {activity.map((a) => {
            const Icon = CATEGORY_ICON[a.category];
            return (
              <li
                key={a.id}
                className="flex items-start gap-3 border-b border-border-subtle px-6 py-4 last:border-0"
              >
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-text-secondary">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-text-primary">{a.message}</p>
                  <p className="text-xs text-text-muted">{a.actor}</p>
                </div>
                <span className="shrink-0 text-[0.6875rem] text-stone-400">
                  {formatRelativeTime(a.timestamp)}
                </span>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}

export { ActivityPanel };
