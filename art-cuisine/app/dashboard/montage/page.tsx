import Link from "next/link";
import { Wrench, CalendarClock, PackageCheck, Ban, ChevronRight } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import {
  filterMontageJobs,
  getMontageListStats,
  getEligibleProjectOptions,
  getMontageScope,
  getInstallationCalendar,
  getMontageStatusLabel,
  getMontageStatusBadge,
  MONTAGE_STAGES,
} from "@/lib/data/montage";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { CreateMontageJobDialog } from "@/components/dashboard/montage/create-montage-job-dialog";
import { formatShortDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MontageStage } from "@/lib/data/operations";

function formatDayHeading(day: string): string {
  const date = new Date(`${day}T00:00:00`);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  if (isSameDay(date, today)) return "Aujourd'hui";
  if (isSameDay(date, tomorrow)) return "Demain";
  return date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

export default async function MontagePage({ searchParams }: PageProps<"/dashboard/montage">) {
  const user = await requirePermission("montage.manage");
  const scope = getMontageScope(user);

  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q : "";
  const stage = typeof params.etape === "string" ? params.etape : "toutes";

  const stats = getMontageListStats(scope);
  const jobs = filterMontageJobs({ search, stage: stage as MontageStage | "toutes" }, scope);
  const projectOptions = getEligibleProjectOptions();
  const calendar = getInstallationCalendar(scope);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-medium text-text-primary sm:text-3xl">
            {scope ? "Mes installations" : "Montage"}
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Planifié → En route → Arrivé → Installation → Ajustements finaux → Nettoyage → Réception client → Terminé.
          </p>
        </div>
        <CreateMontageJobDialog projectOptions={projectOptions} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Installations actives" value={String(stats.inProgress)} icon={Wrench} helperText={`sur ${stats.total} au total`} />
        <StatCard label="Aujourd'hui" value={String(stats.today)} icon={CalendarClock} helperText="interventions prévues" />
        <StatCard label="Terminées" value={String(stats.done)} icon={PackageCheck} helperText="réceptionnées" />
        <StatCard label="Annulées" value={String(stats.cancelled)} icon={Ban} helperText="sur demande client" />
      </div>

      <div>
        <h2 className="mb-3 font-display text-lg font-medium text-text-primary">Calendrier des installations</h2>
        {calendar.length === 0 ? (
          <Card className="px-6 py-10 text-center text-sm text-text-muted">Aucune installation planifiée.</Card>
        ) : (
          <div className="flex flex-col gap-3">
            {calendar.map((group) => (
              <Card key={group.day} className="overflow-hidden">
                <div className="border-b border-border-subtle bg-surface-sunken px-6 py-3">
                  <p className="text-sm font-semibold capitalize text-text-primary">{formatDayHeading(group.day)}</p>
                </div>
                <div className="flex flex-col px-6">
                  {group.jobs.map((j) => (
                    <Link
                      key={j.id}
                      href={`/dashboard/montage/${j.id}`}
                      className="flex items-center gap-3 border-b border-border-subtle py-3.5 last:border-0 hover:opacity-80"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-text-secondary">
                        <Wrench className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text-primary">{j.clientName} — {j.projectRef}</p>
                        <p className="text-xs text-text-muted">
                          {formatShortDateTime(j.scheduledDate)} · {j.assignedTeam.join(", ") || "Équipe non assignée"}
                          {j.assignedVehicle && ` · ${j.assignedVehicle}`}
                        </p>
                      </div>
                      <Badge variant={getMontageStatusBadge(j)}>{getMontageStatusLabel(j)}</Badge>
                    </Link>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border-subtle p-3">
          <Link
            href="/dashboard/montage"
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium",
              stage === "toutes" ? "bg-ink-950 text-white" : "text-text-secondary hover:bg-surface-sunken",
            )}
          >
            Toutes
          </Link>
          {MONTAGE_STAGES.map((s) => (
            <Link
              key={s}
              href={`/dashboard/montage?etape=${encodeURIComponent(s)}`}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium",
                stage === s ? "bg-ink-950 text-white" : "text-text-secondary hover:bg-surface-sunken",
              )}
            >
              {s}
            </Link>
          ))}
        </div>
        <Table className="border-none">
          <TableHeader>
            <TableRow>
              <TableHead>Référence</TableHead>
              <TableHead>Projet</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Équipe</TableHead>
              <TableHead>Véhicule</TableHead>
              <TableHead>Avancement</TableHead>
              <TableHead>Intervention</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-sm text-text-muted">
                  {scope ? "Aucune installation ne vous est assignée pour le moment." : "Aucune installation ne correspond à ces critères."}
                </TableCell>
              </TableRow>
            )}
            {jobs.map((j) => (
              <TableRow key={j.id}>
                <TableCell className="font-medium text-text-secondary">
                  <Link href={`/dashboard/montage/${j.id}`} className="hover:text-text-accent">{j.ref}</Link>
                </TableCell>
                <TableCell className="text-text-primary">{j.projectRef}</TableCell>
                <TableCell className="text-text-secondary">{j.clientName}</TableCell>
                <TableCell>
                  <Badge variant={getMontageStatusBadge(j)}>{getMontageStatusLabel(j)}</Badge>
                </TableCell>
                <TableCell className="text-text-secondary">
                  {j.assignedTeam.length > 0 ? j.assignedTeam.join(", ") : "—"}
                </TableCell>
                <TableCell className="text-text-secondary">{j.assignedVehicle ?? "—"}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-sunken">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${j.progress}%` }} />
                    </div>
                    <span className="text-xs text-text-muted">{j.progress}%</span>
                  </div>
                </TableCell>
                <TableCell className="text-text-secondary">{formatShortDateTime(j.scheduledDate)}</TableCell>
                <TableCell>
                  <Link href={`/dashboard/montage/${j.id}`} className="focus-ring flex h-8 w-8 items-center justify-center rounded-md text-text-muted hover:text-text-primary">
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
