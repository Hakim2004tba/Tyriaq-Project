import { Wallet, Clock, AlertTriangle, TrendingUp } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { getOwnerScope } from "@/lib/data/scope";
import {
  filterPayments,
  getFinanceListStats,
  getPaymentTargetOptions,
  PAYMENT_METHODS,
} from "@/lib/data/finance";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { PaymentsTable } from "@/components/dashboard/finance/payments-table";
import { RecordPaymentDialog } from "@/components/dashboard/finance/record-payment-dialog";
import { FinanceFilters } from "@/components/dashboard/finance/finance-filters";
import { formatCurrencyCompactDA } from "@/lib/format";
import type { PaymentMethod, PaymentStatus } from "@/lib/data/operations";

export default async function FinancePage({ searchParams }: PageProps<"/dashboard/finance">) {
  const user = await requirePermission("finance.manage");
  const scope = getOwnerScope(user);

  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q : "";
  const method = typeof params.methode === "string" ? params.methode : "tous";
  const status = typeof params.statut === "string" ? params.statut : "tous";

  const [stats, payments, targetOptions] = await Promise.all([
    getFinanceListStats(scope),
    filterPayments(
      { search, method: method as PaymentMethod | "tous", status: status as PaymentStatus | "tous" },
      scope,
    ),
    getPaymentTargetOptions(scope),
  ]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-medium text-text-primary sm:text-3xl">Finances</h1>
          <p className="mt-1 text-sm text-text-muted">
            Acomptes, échéanciers, paiements et soldes restants — pour chaque client, devis et projet.
          </p>
        </div>
        <RecordPaymentDialog targetOptions={targetOptions} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total encaissé" value={formatCurrencyCompactDA(stats.totalCollected)} icon={TrendingUp} helperText="paiements reçus" />
        <StatCard label="En attente" value={formatCurrencyCompactDA(stats.pendingAmount)} icon={Clock} helperText={`${stats.pendingCount} paiement${stats.pendingCount > 1 ? "s" : ""}`} />
        <StatCard label="En retard" value={formatCurrencyCompactDA(stats.overdueAmount)} icon={AlertTriangle} helperText={`${stats.overdueCount} paiement${stats.overdueCount > 1 ? "s" : ""}`} />
        <StatCard label="Méthodes" value={String(PAYMENT_METHODS.length)} icon={Wallet} helperText="espèces, virement, CCP, carte, autre" />
      </div>

      <FinanceFilters search={search} method={method} status={status} />

      <Card className="overflow-hidden">
        <PaymentsTable payments={payments} showClient showProject />
      </Card>
    </div>
  );
}
