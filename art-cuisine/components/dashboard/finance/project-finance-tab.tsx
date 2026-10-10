import Link from "next/link";
import { FileOutput } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PaymentsTable } from "@/components/dashboard/finance/payments-table";
import { RecordPaymentDialog } from "@/components/dashboard/finance/record-payment-dialog";
import { getProjectFinancials, FINANCIAL_STATUS_BADGE } from "@/lib/data/finance";
import { formatCurrencyDA } from "@/lib/format";
import type { ProjectRecord } from "@/lib/data/operations";

async function ProjectFinanceTab({ project }: { project: ProjectRecord }) {
  const financials = await getProjectFinancials(project);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Total projet</p>
          <p className="mt-1.5 text-lg font-medium text-text-primary">{formatCurrencyDA(financials.total)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Acompte</p>
          <p className="mt-1.5 text-lg font-medium text-text-primary">{formatCurrencyDA(financials.depositAmount)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Encaissé</p>
          <p className="mt-1.5 text-lg font-medium text-[var(--status-success-fg)]">{formatCurrencyDA(financials.paid)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Solde restant</p>
          <p className="mt-1.5 text-lg font-medium text-text-primary">{formatCurrencyDA(financials.remaining)}</p>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-sm text-text-muted">Statut financier :</span>
          <Badge variant={FINANCIAL_STATUS_BADGE[financials.status]}>{financials.status}</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" asChild>
            <Link href={`/facture/${project.id}`} target="_blank" rel="noopener noreferrer">
              <FileOutput className="h-3.5 w-3.5" /> Facture (PDF / Imprimer)
            </Link>
          </Button>
          <RecordPaymentDialog lockedTarget={`project:${project.id}`} lockedTargetLabel={`${project.ref} — ${project.name}`} />
        </div>
      </div>

      <Card className="overflow-hidden">
        <PaymentsTable payments={financials.payments} />
      </Card>
    </div>
  );
}

export { ProjectFinanceTab };
