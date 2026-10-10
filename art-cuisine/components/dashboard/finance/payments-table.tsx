import Link from "next/link";
import { Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { PaymentStatusSelect } from "@/components/dashboard/finance/payment-status-select";
import { EditPaymentDialog } from "@/components/dashboard/finance/edit-payment-dialog";
import { DeletePaymentButton } from "@/components/dashboard/finance/delete-payment-button";
import { PAYMENT_STATUS_BADGE, getPaymentDisplayStatus } from "@/lib/data/finance";
import { formatCurrencyDA, formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PaymentRecord } from "@/lib/data/operations";

function PaymentsTable({ payments, showClient = false, showProject = false }: { payments: PaymentRecord[]; showClient?: boolean; showProject?: boolean }) {
  if (payments.length === 0) {
    return <p className="py-8 text-center text-sm text-text-muted">Aucun paiement.</p>;
  }

  return (
    <Table className="border-none">
      <TableHeader>
        <TableRow>
          <TableHead>Référence</TableHead>
          {showClient && <TableHead>Client</TableHead>}
          {showProject && <TableHead>Projet / devis</TableHead>}
          <TableHead>Libellé</TableHead>
          <TableHead>Méthode</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead>Date</TableHead>
          <TableHead className="text-right">Montant</TableHead>
          <TableHead className="w-44" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {payments.map((p) => {
          const displayStatus = getPaymentDisplayStatus(p);
          return (
            <TableRow key={p.id}>
              <TableCell className="font-medium text-text-secondary">{p.id}</TableCell>
              {showClient && <TableCell className="text-text-primary">{p.clientName}</TableCell>}
              {showProject && <TableCell className="text-text-secondary">{p.projectRef ?? "— (devis)"}</TableCell>}
              <TableCell className="text-text-secondary">{p.label}</TableCell>
              <TableCell className="text-text-secondary">{p.method}</TableCell>
              <TableCell>
                <Badge variant={PAYMENT_STATUS_BADGE[displayStatus]}>{displayStatus}</Badge>
              </TableCell>
              <TableCell className={cn("text-text-secondary", displayStatus === "En retard" && "font-medium text-[var(--status-danger-fg)]")}>
                {formatShortDate(p.date)}
              </TableCell>
              <TableCell className="text-right font-medium">{formatCurrencyDA(p.amount)}</TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1.5">
                  {p.status === "Payé" && (
                    <Link
                      href={`/recu-paiement/${p.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="focus-ring flex h-8 w-8 items-center justify-center rounded-md text-text-muted hover:text-text-primary"
                      aria-label="Voir le reçu"
                    >
                      <Receipt className="h-3.5 w-3.5" />
                    </Link>
                  )}
                  <PaymentStatusSelect paymentId={p.id} status={p.status} className="h-8 w-28 text-xs" />
                  <EditPaymentDialog payment={p} />
                  <DeletePaymentButton paymentId={p.id} />
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export { PaymentsTable };
