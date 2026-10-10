import { AlertOctagon } from "lucide-react";
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
import { formatCurrencyDA, formatShortDate } from "@/lib/format";
import { getDelayedProjects, daysLate } from "@/lib/data/metrics";

function DelayedProjectsPanel() {
  const delayed = getDelayedProjects();

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--status-danger-bg)] text-[var(--status-danger-fg)]">
          <AlertOctagon className="h-5 w-5" />
        </span>
        <div>
          <CardTitle>Projets en retard</CardTitle>
          <CardDescription>
            {delayed.length} projet{delayed.length > 1 ? "s" : ""} au-delà de leur date de livraison.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table className="border-none">
          <TableHeader>
            <TableRow>
              <TableHead>Référence</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Étape</TableHead>
              <TableHead>Livraison prévue</TableHead>
              <TableHead>Retard</TableHead>
              <TableHead className="text-right">Montant</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {delayed.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-text-muted">
                  Aucun projet en retard. 🎉
                </TableCell>
              </TableRow>
            )}
            {delayed.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium text-text-secondary">{p.ref}</TableCell>
                <TableCell>{p.clientName}</TableCell>
                <TableCell>
                  <Badge variant="warning">{p.stage}</Badge>
                </TableCell>
                <TableCell className="text-text-secondary">{formatShortDate(p.dueDate)}</TableCell>
                <TableCell>
                  <Badge variant="danger">{daysLate(p.dueDate)} jour{daysLate(p.dueDate) > 1 ? "s" : ""}</Badge>
                </TableCell>
                <TableCell className="text-right font-medium">{formatCurrencyDA(p.amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export { DelayedProjectsPanel };
