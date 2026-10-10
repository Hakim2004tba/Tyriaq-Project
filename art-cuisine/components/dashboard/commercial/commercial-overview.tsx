import Link from "next/link";
import {
  Users,
  Target,
  FileText,
  Wallet,
  CalendarClock,
  MessageCircle,
  AlertTriangle,
  ArrowUpRight,
  ListChecks,
  CalendarDays,
  CalendarCheck,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatCurrencyDA, formatCurrencyCompactDA, formatRelativeTime, formatShortDate } from "@/lib/format";
import { getOwnerScope } from "@/lib/data/scope";
import { getLeadListStats } from "@/lib/data/leads";
import { getClientListStats } from "@/lib/data/clients";
import { getDevisListStats } from "@/lib/data/devis";
import {
  getMyRevenueLast30Days,
  getMyPipelineFunnel,
  getMyAgenda,
  getMyPendingPayments,
  getMyRecentMessages,
} from "@/lib/data/personal";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/data/operations";
import type { SessionUser } from "@/lib/auth/session";

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

const QUICK_LINKS = [
  { href: "/dashboard/leads", label: "Mes leads", icon: Target },
  { href: "/dashboard/clients", label: "Mes clients", icon: Users },
  { href: "/dashboard/devis", label: "Mes devis", icon: FileText },
  { href: "/dashboard/rendez-vous", label: "Rendez-vous", icon: CalendarCheck },
  { href: "/dashboard/suivi", label: "Mon suivi", icon: ListChecks },
  { href: "/dashboard/calendrier", label: "Calendrier", icon: CalendarDays },
];

async function CommercialOverview({ user }: { user: SessionUser }) {
  const scope = getOwnerScope(user);
  const firstName = user.name.split(" ")[0];

  const [leadStats, clientStats, devisStats, revenue, funnel, agendaFull, pendingPaymentsFull, messagesFull] = await Promise.all([
    getLeadListStats(scope),
    getClientListStats(scope),
    getDevisListStats(scope),
    getMyRevenueLast30Days(scope),
    getMyPipelineFunnel(scope),
    getMyAgenda(scope),
    getMyPendingPayments(scope),
    getMyRecentMessages(scope, 5),
  ]);
  const funnelTotal = funnel.reduce((sum, f) => sum + f.count, 0);
  const agenda = agendaFull.slice(0, 5);
  const pendingPayments = pendingPaymentsFull.slice(0, 5);
  const messages = messagesFull;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl font-medium text-text-primary sm:text-3xl">
          Bonjour {firstName},
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Votre espace commercial — clients, leads et devis dont vous êtes responsable.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Mes leads actifs" value={String(leadStats.total)} icon={Target} helperText={`${leadStats.newThisWeek} nouveaux cette semaine`} />
        <StatCard label="Mes clients" value={String(clientStats.total)} icon={Users} helperText={`${clientStats.active} actifs`} />
        <StatCard label="Mes devis en attente" value={String(devisStats.pending)} icon={FileText} helperText={`${devisStats.conversionRate}% de conversion`} />
        <StatCard label="Mon CA (30 jours)" value={formatCurrencyCompactDA(revenue)} icon={Wallet} helperText="paiements de mes clients" />
      </div>

      <div className="flex flex-wrap gap-3">
        {QUICK_LINKS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="focus-ring flex items-center gap-2 rounded-full border border-border-default bg-surface-raised px-4 py-2 text-xs font-semibold uppercase tracking-wider text-text-secondary transition-colors hover:border-ink-950 hover:text-text-primary"
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mon pipeline commercial</CardTitle>
          <CardDescription>{funnelTotal} leads suivis, toutes étapes confondues.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-sunken">
            {funnel.map(({ status, count }) => {
              if (count === 0 || funnelTotal === 0) return null;
              return (
                <div
                  key={status}
                  className={cn(STAGE_ACCENT[status])}
                  style={{ width: `${(count / funnelTotal) * 100}%` }}
                  title={`${status} — ${count}`}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {LEAD_STATUSES.map((status) => {
              const count = funnel.find((f) => f.status === status)?.count ?? 0;
              return (
                <span key={status} className="flex items-center gap-2 text-xs text-text-muted">
                  <span className={cn("h-2 w-2 rounded-full", STAGE_ACCENT[status])} />
                  {status} — <span className="font-medium text-text-primary">{count}</span>
                </span>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>À venir</CardTitle>
              <CardDescription>Rendez-vous, tâches et rappels prochains.</CardDescription>
            </div>
            <Link href="/dashboard/calendrier" className="flex items-center gap-1 text-xs font-semibold text-text-accent hover:opacity-70">
              Calendrier <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="flex flex-col p-0 px-6 pb-2">
            {agenda.length === 0 && (
              <p className="py-8 text-center text-sm text-text-muted">Rien de prévu pour le moment.</p>
            )}
            {agenda.map((entry) => (
              <Link
                key={entry.id}
                href={entry.href}
                className="flex items-center gap-3 border-b border-border-subtle py-3 last:border-0 hover:opacity-80"
              >
                <CalendarClock className="h-4 w-4 shrink-0 text-text-muted" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-primary">{entry.title}</p>
                  <p className="text-xs text-text-muted">{entry.subtitle}</p>
                </div>
                <span className="shrink-0 text-xs text-text-muted">{formatShortDate(entry.date)}</span>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--status-warning-bg)] text-[var(--status-warning-fg)]">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div>
              <CardTitle>Relances paiement</CardTitle>
              <CardDescription>Échéances en attente ou en retard.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col p-0 px-6 pb-2">
            {pendingPayments.length === 0 && (
              <p className="py-8 text-center text-sm text-text-muted">Aucune relance à faire. 🎉</p>
            )}
            {pendingPayments.map((p) => (
              <div key={p.id} className="flex items-center gap-3 border-b border-border-subtle py-3 last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-primary">{p.clientName}</p>
                  <p className="text-xs text-text-muted">{p.label}</p>
                </div>
                <Badge variant={p.status === "En retard" ? "danger" : "warning"}>{p.status}</Badge>
                <span className="shrink-0 text-sm font-medium text-text-primary">{formatCurrencyDA(p.amount)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-accent-strong">
            <MessageCircle className="h-5 w-5" />
          </span>
          <div>
            <CardTitle>Communications récentes</CardTitle>
            <CardDescription>Les derniers échanges avec vos clients.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col p-0 px-6 pb-2">
          {messages.length === 0 && (
            <p className="py-8 text-center text-sm text-text-muted">Aucun message récent.</p>
          )}
          {messages.map((m) => (
            <div key={m.id} className="flex items-start gap-3 border-b border-border-subtle py-3 last:border-0">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-text-primary">
                  <span className="font-medium">{m.clientName}</span>
                  {m.sender === "client" ? " vous a écrit" : " — vous avez répondu"}
                </p>
                <p className="mt-0.5 truncate text-xs text-text-muted">{m.content}</p>
              </div>
              <span className="shrink-0 text-xs text-stone-400">{formatRelativeTime(m.timestamp)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export { CommercialOverview };
