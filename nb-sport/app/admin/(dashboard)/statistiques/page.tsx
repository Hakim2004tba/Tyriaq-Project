import { getOrders, getProducts } from "@/lib/server/store";
import { RevenueChart, StatusPieChart, TopProductsChart } from "@/components/admin/charts";
import { ORDER_STATUS_LABELS } from "@/components/admin/status-badge";
import { formatPrice } from "@/lib/utils";
import { TrendingUp, Percent, Package2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminStatsPage() {
  const [orders, products] = await Promise.all([getOrders(), getProducts()]);
  const db = { orders, products };

  const months = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    return d;
  });
  const revenueByMonth = months.map((d) => {
    const label = d.toLocaleDateString("fr-FR", { month: "short" });
    const monthOrders = db.orders.filter(
      (o) => new Date(o.creeLe).getMonth() === d.getMonth() && new Date(o.creeLe).getFullYear() === d.getFullYear()
    );
    return { label, revenu: monthOrders.reduce((s, o) => s + o.montant, 0) };
  });

  const statusCounts = Object.keys(ORDER_STATUS_LABELS).map((key) => ({
    name: ORDER_STATUS_LABELS[key as keyof typeof ORDER_STATUS_LABELS],
    value: db.orders.filter((o) => o.statut === key).length,
  }));

  const sales = new Map<string, number>();
  for (const order of db.orders) for (const item of order.articles) sales.set(item.nom, (sales.get(item.nom) ?? 0) + item.quantite);
  const topProducts = [...sales.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([nom, ventes]) => ({ nom, ventes }));

  const totalRevenue = db.orders.filter((o) => o.statut !== "annulee").reduce((s, o) => s + o.montant, 0);
  const avgBasket = db.orders.length ? totalRevenue / db.orders.filter((o) => o.statut !== "annulee").length : 0;
  const conversion = ((db.orders.filter((o) => o.statut === "livree").length / Math.max(db.orders.length, 1)) * 100).toFixed(0);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="nb-card flex items-center gap-4 p-5">
          <TrendingUp className="h-8 w-8 text-accent-strong" />
          <div>
            <p className="text-xl font-black">{formatPrice(avgBasket)}</p>
            <p className="text-xs text-muted">Panier moyen</p>
          </div>
        </div>
        <div className="nb-card flex items-center gap-4 p-5">
          <Percent className="h-8 w-8 text-accent-strong" />
          <div>
            <p className="text-xl font-black">{conversion}%</p>
            <p className="text-xs text-muted">Taux de livraison</p>
          </div>
        </div>
        <div className="nb-card flex items-center gap-4 p-5">
          <Package2 className="h-8 w-8 text-accent-strong" />
          <div>
            <p className="text-xl font-black">{db.products.reduce((s, p) => s + p.stock, 0)}</p>
            <p className="text-xs text-muted">Unités en stock</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="nb-card p-5">
          <h3 className="mb-4 text-sm font-bold">Chiffre d&apos;affaires mensuel</h3>
          <RevenueChart data={revenueByMonth} />
        </div>
        <div className="nb-card p-5">
          <h3 className="mb-4 text-sm font-bold">Répartition des statuts de commande</h3>
          <StatusPieChart data={statusCounts} />
        </div>
      </div>

      <div className="nb-card p-5">
        <h3 className="mb-4 text-sm font-bold">Produits les plus vendus</h3>
        <TopProductsChart data={topProducts} />
      </div>
    </div>
  );
}
