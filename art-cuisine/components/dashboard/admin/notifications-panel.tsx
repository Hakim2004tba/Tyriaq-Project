import { Bell, FileText, Headset, FolderKanban, Wallet, Target, Users, Factory, Paintbrush, Wrench } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/format";
import { getNotifications } from "@/lib/data/metrics";
import type { ActivityCategory } from "@/lib/data/operations";

const CATEGORY_ICON: Record<ActivityCategory, typeof Bell> = {
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

function NotificationsPanel() {
  const notifications = getNotifications();

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-accent-strong">
          <Bell className="h-5 w-5" />
        </span>
        <div>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Les derniers événements qui méritent votre attention.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 p-0">
        {notifications.map((n) => {
          const Icon = CATEGORY_ICON[n.category];
          return (
            <div
              key={n.id}
              className="flex items-start gap-3 border-b border-border-subtle px-6 py-4 last:border-0"
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-text-secondary">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text-primary">{n.title}</p>
                <p className="text-xs text-text-muted">{n.description}</p>
              </div>
              <span className="shrink-0 text-[0.6875rem] text-stone-400">
                {formatRelativeTime(n.timestamp)}
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export { NotificationsPanel };
