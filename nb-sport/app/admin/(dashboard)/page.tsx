import { DollarSign, ShoppingBag, Package, Users, Clock, Truck, CheckCircle2, XCircle } from "lucide-react";
import { getOrders, getProducts, getCustomers } from "@/lib/server/store";
import { StatCard } from "@/components/admin/stat-card";
import { RevenueChart, OrdersChart, TopProductsChart } from "@/components/admin/charts";
import { OrderStatusBadge } from "@/components/admin/status-badge";
import { formatDate, formatPrice } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [orders, products, customers] = await Promise.all([getOrders(), getProducts(), getCustomers()]);
  const db = { orders, products, customers };
  const revenue = db.orders.filter((o) => o.statut !== "annulee").reduce((sum, o) => sum + o.montant, 0);
  const pending = db.orders.filter((o) => o.statut === "nouvelle" || o.statut === "preparation").length;
  const shipped = db.orders.filter((o) => o.statut === "expediee").length;
  const delivered = db.orders.filter((o) => o.statut === "livree").length;
  const cancelled = db.orders.filter((o) => o.statut === "annulee").length;

  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
  const revenueData = days.map((d) => {
    const label = d.toLocaleDateString("fr-FR", { weekday: "short" });
    const dayOrders = db.orders.filter((o) => new Date(o.creeLe).toDateString() === d.toDateString());
    return { label, revenu: dayOrders.reduce((s, o) => s + o.montant, 0) };
  });
  const ordersData = days.map((d) => {
    const label = d.toLocaleDateString("fr-FR", { weekday: "short" });
    const count = db.orders.filter((o) => new Date(o.creeLe).toDateString() === d.toDateString()).length;
    return { label, commandes: count };
  });

  const sales = new Map<string, number>();
  for (const order of db.orders) {
    for (const item of order.articles) {
      sales.set(item.nom, (sales.get(item.nom) ?? 0) + item.quantite);
    }
  }
  const topProducts = [...sales.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([nom, ventes]) => ({ nom, ventes }));

  const recentOrders = [...db.orders].sort((a, b) => +new Date(b.creeLe) - +new Date(a.creeLe)).slice(0, 6);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={DollarSign} label="Chiffre d'affaires" value={formatPrice(revenue)} trend="+12%" />
        <StatCard icon={ShoppingBag} label="Commandes" value={String(db.orders.length)} trend="+8%" />
        <StatCard icon={Package} label="Produits" value={String(db.products.length)} />
        <StatCard icon={Users} label="Clients" value={String(db.customers.length)} trend="+5%" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Clock} label="En attente" value={String(pending)} accent="warning" />
        <StatCard icon={Truck} label="Expédiées" value={String(shipped)} />
        <StatCard icon={CheckCircle2} label="Livrées" value={String(delivered)} />
        <StatCard icon={XCircle} label="Annulées" value={String(cancelled)} accent="danger" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="nb-card p-5 lg:col-span-2">
          <h3 className="mb-4 text-sm font-bold">Évolution du chiffre d&apos;affaires (7 derniers jours)</h3>
          <RevenueChart data={revenueData} />
        </div>
        <div className="nb-card p-5">
          <h3 className="mb-4 text-sm font-bold">Produits les plus vendus</h3>
          <TopProductsChart data={topProducts} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="nb-card p-5 lg:col-span-2">
          <h3 className="mb-4 text-sm font-bold">Commandes (7 derniers jours)</h3>
          <OrdersChart data={ordersData} />
        </div>
        <div className="nb-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold">Commandes récentes</h3>
            <Link href="/admin/commandes" className="text-xs font-semibold text-accent-strong">
              Voir tout
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {recentOrders.map((o) => (
              <div key={o.id} className="flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold">{o.numero}</p>
                  <p className="text-muted">{formatDate(o.creeLe)}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatPrice(o.montant)}</p>
                  <OrderStatusBadge status={o.statut} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
