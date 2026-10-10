import { Users, Target, FileText, FileCheck2, Wallet } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrencyCompactDA } from "@/lib/format";
import {
  getRevenueMetrics,
  getLeadsMetrics,
  getClientsMetrics,
  getDevisMetrics,
  type PeriodKey,
} from "@/lib/data/metrics";

async function KpiRow({ period }: { period: PeriodKey }) {
  const revenue = getRevenueMetrics(period);
  const [leads, clients, devis] = await Promise.all([
    getLeadsMetrics(period),
    getClientsMetrics(period),
    getDevisMetrics(period),
  ]);

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      <StatCard
        label="Chiffre d'affaires encaissé"
        value={formatCurrencyCompactDA(revenue.collected)}
        icon={Wallet}
        trend={revenue.trend}
        helperText="paiements reçus sur la période"
      />
      <StatCard
        label="Leads"
        value={String(leads.total)}
        icon={Target}
        trend={leads.trend}
        helperText={`${leads.won} converti${leads.won > 1 ? "s" : ""} en client`}
      />
      <StatCard
        label="Clients"
        value={String(clients.total)}
        icon={Users}
        trend={clients.trend}
        helperText={`+${clients.newInPeriod} sur la période`}
      />
      <StatCard
        label="Devis envoyés"
        value={String(devis.total)}
        icon={FileText}
        trend={devis.trend}
        helperText={formatCurrencyCompactDA(devis.sentAmount)}
      />
      <StatCard
        label="Devis acceptés"
        value={String(devis.accepted.count)}
        icon={FileCheck2}
        trend={devis.accepted.trend}
        helperText={`${devis.conversionRate}% de conversion`}
      />
    </div>
  );
}

export { KpiRow };
