import { Headset, AlarmClockOff } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/format";
import { getSavMetrics } from "@/lib/data/metrics";
import type { SavPriority, SavStatus } from "@/lib/data/operations";

const PRIORITY_VARIANT: Record<SavPriority, "neutral" | "info" | "warning" | "danger"> = {
  Basse: "neutral",
  Normale: "info",
  Haute: "warning",
  Urgente: "danger",
};

const STATUS_VARIANT: Record<SavStatus, "danger" | "warning" | "info" | "success"> = {
  Ouvert: "danger",
  Planifié: "warning",
  "En cours": "info",
  Résolu: "success",
};

function SavPanel() {
  const sav = getSavMetrics();

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Tickets ouverts" value={String(sav.openCount)} icon={Headset} helperText="tous statuts non résolus" />
        <StatCard label="Urgents" value={String(sav.urgentCount)} icon={AlarmClockOff} helperText="priorité urgente" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>File SAV</CardTitle>
          <CardDescription>Interventions en cours, par ancienneté.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table className="border-none">
            <TableHeader>
              <TableRow>
                <TableHead>Ticket</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Problème</TableHead>
                <TableHead>Priorité</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Ouvert</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sav.list.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-text-muted">
                    Aucun ticket SAV ouvert. 🎉
                  </TableCell>
                </TableRow>
              )}
              {sav.list.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium text-text-secondary">{t.ref}</TableCell>
                  <TableCell>{t.clientName}</TableCell>
                  <TableCell className="text-text-secondary">{t.issue}</TableCell>
                  <TableCell>
                    <Badge variant={PRIORITY_VARIANT[t.priority]}>{t.priority}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[t.status]}>{t.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right text-xs text-text-muted">
                    {formatRelativeTime(t.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export { SavPanel };
