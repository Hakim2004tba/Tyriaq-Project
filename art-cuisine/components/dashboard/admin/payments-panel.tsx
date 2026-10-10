import { Wallet, AlertTriangle } from "lucide-react";
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
import { formatCurrencyDA } from "@/lib/format";
import { getPaymentsMetrics, type PeriodKey } from "@/lib/data/metrics";
import type { PaymentStatus } from "@/lib/data/operations";

const STATUS_VARIANT: Record<PaymentStatus, "success" | "warning" | "danger"> = {
  Payé: "success",
  "En attente": "warning",
  "En retard": "danger",
};

function PaymentsPanel({ period }: { period: PeriodKey }) {
  const payments = getPaymentsMetrics(period);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          label="Paiements en attente"
          value={formatCurrencyDA(payments.pendingAmount)}
          icon={Wallet}
          helperText={`${payments.pendingCount} échéance${payments.pendingCount > 1 ? "s" : ""}`}
        />
        <StatCard
          label="Paiements en retard"
          value={formatCurrencyDA(payments.overdueAmount)}
          icon={AlertTriangle}
          helperText={`${payments.overdueCount} échéance${payments.overdueCount > 1 ? "s" : ""}`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Paiements récents</CardTitle>
          <CardDescription>Encaissements et échéances sur la période sélectionnée.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table className="border-none">
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Projet</TableHead>
                <TableHead>Échéance</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Montant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.recent.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-text-muted">
                    Aucun paiement sur cette période.
                  </TableCell>
                </TableRow>
              )}
              {payments.recent.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.clientName}</TableCell>
                  <TableCell className="text-text-secondary">{p.projectRef}</TableCell>
                  <TableCell className="text-text-secondary">{p.label}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[p.status]}>{p.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatCurrencyDA(p.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export { PaymentsPanel };
