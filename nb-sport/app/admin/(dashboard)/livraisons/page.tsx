import Link from "next/link";
import { Package, Truck, CheckCircle2, RotateCcw } from "lucide-react";
import { getOrders } from "@/lib/server/store";
import { formatDate, formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminDeliveriesPage() {
  const orders = await getOrders();
  const toShip = orders.filter((o) => o.statut === "nouvelle" || o.statut === "preparation");
  const inTransit = orders.filter((o) => o.statut === "expediee");
  const delivered = orders.filter((o) => o.statut === "livree");
  const returned = orders.filter((o) => o.statut === "annulee");

  const columns = [
    { title: "À livrer", icon: Package, orders: toShip, accent: "text-warning" },
    { title: "En cours de livraison", icon: Truck, orders: inTransit, accent: "text-accent-strong" },
    { title: "Livrées", icon: CheckCircle2, orders: delivered, accent: "text-accent-strong" },
    { title: "Retournées / Annulées", icon: RotateCcw, orders: returned, accent: "text-danger" },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
      {columns.map((col) => (
        <div key={col.title} className="nb-card flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border p-4">
            <col.icon className={`h-4 w-4 ${col.accent}`} />
            <p className="text-sm font-bold">{col.title}</p>
            <span className="ml-auto text-xs text-muted">{col.orders.length}</span>
          </div>
          <div className="flex flex-1 flex-col gap-3 p-4">
            {col.orders.length === 0 && <p className="text-xs text-muted">Aucune commande</p>}
            {col.orders.map((o) => (
              <Link
                key={o.id}
                href={`/admin/commandes/${o.id}`}
                className="rounded-lg border border-border p-3 text-xs transition-colors hover:border-accent-strong"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-accent-strong">{o.numero}</span>
                  <span className="font-semibold">{formatPrice(o.montant)}</span>
                </div>
                <p className="mt-1 text-muted">{o.clientNom} · {o.wilaya}</p>
                <p className="mt-1 text-muted">{formatDate(o.creeLe)}</p>
                {o.livraison?.transporteur && (
                  <p className="mt-1 font-medium text-foreground">
                    {o.livraison.transporteur} {o.livraison.numeroSuivi && `· ${o.livraison.numeroSuivi}`}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
