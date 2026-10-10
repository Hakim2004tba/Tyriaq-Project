"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye } from "lucide-react";
import type { Order, OrderStatus } from "@/lib/types";
import { ORDER_STATUS_LABELS } from "@/components/admin/status-badge";
import { formatDate, formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";

const STATUS_FILTERS: (OrderStatus | "toutes")[] = ["toutes", "nouvelle", "preparation", "expediee", "livree", "annulee"];

export function OrdersTable({ initialOrders }: { initialOrders: Order[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [filter, setFilter] = useState<OrderStatus | "toutes">("toutes");

  async function updateStatus(id: string, statut: OrderStatus) {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, statut } : o)));
    await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut }),
    });
  }

  const filtered = filter === "toutes" ? orders : orders.filter((o) => o.statut === filter);

  return (
    <div className="nb-card overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
              filter === s
                ? "border-accent-strong bg-accent/10 text-accent-strong"
                : "border-border text-muted hover:border-accent-strong"
            )}
          >
            {s === "toutes" ? "Toutes" : ORDER_STATUS_LABELS[s]}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-semibold">Commande</th>
              <th className="px-4 py-3 font-semibold">Client</th>
              <th className="px-4 py-3 font-semibold">Montant</th>
              <th className="px-4 py-3 font-semibold">Paiement</th>
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Statut</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.id} className="border-b border-border last:border-0 hover:bg-surface-2/50">
                <td className="px-4 py-3 font-semibold text-accent-strong">{o.numero}</td>
                <td className="px-4 py-3">
                  <p className="font-medium">{o.clientNom}</p>
                  <p className="text-xs text-muted">{o.clientTelephone}</p>
                </td>
                <td className="px-4 py-3 font-semibold">{formatPrice(o.montant)}</td>
                <td className="px-4 py-3 text-muted">
                  {o.methodePaiement === "paiement_livraison" ? "Paiement à la livraison" : "Carte"}
                </td>
                <td className="px-4 py-3 text-muted">{formatDate(o.creeLe)}</td>
                <td className="px-4 py-3">
                  <select
                    value={o.statut}
                    onChange={(e) => updateStatus(o.id, e.target.value as OrderStatus)}
                    className="h-8 rounded-lg border border-border bg-surface-2 px-2 text-xs outline-none focus:border-accent-strong"
                  >
                    {Object.entries(ORDER_STATUS_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/commandes/${o.id}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-accent-strong"
                  >
                    <Eye className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
