"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin, Phone, User, Wallet, Truck } from "lucide-react";
import type { Order, OrderStatus } from "@/lib/types";
import { ORDER_STATUS_LABELS, OrderStatusBadge } from "@/components/admin/status-badge";
import { formatDate, formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function OrderDetailPanel({ order: initialOrder }: { order: Order }) {
  const [order, setOrder] = useState(initialOrder);
  const [transporteur, setTransporteur] = useState(order.livraison?.transporteur ?? "");
  const [numeroSuivi, setNumeroSuivi] = useState(order.livraison?.numeroSuivi ?? "");
  const [notes, setNotes] = useState(order.livraison?.notes ?? "");
  const [saving, setSaving] = useState(false);

  async function updateStatus(statut: OrderStatus) {
    setOrder((o) => ({ ...o, statut }));
    await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut }),
    });
  }

  async function saveLivraison() {
    setSaving(true);
    try {
      await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ livraison: { transporteur, numeroSuivi, notes } }),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/commandes" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-accent-strong">
        <ArrowLeft className="h-4 w-4" /> Retour aux commandes
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{order.numero}</h2>
          <p className="text-sm text-muted">{formatDate(order.creeLe)}</p>
        </div>
        <OrderStatusBadge status={order.statut} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="flex flex-col gap-5">
          <div className="nb-card p-5">
            <h3 className="mb-4 text-sm font-bold">Articles commandés</h3>
            <div className="flex flex-col gap-3">
              {order.articles.map((a, i) => (
                <div key={i} className="flex justify-between border-b border-border pb-3 text-sm last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium">{a.nom}</p>
                    <p className="text-xs text-muted">
                      {a.quantite} x {formatPrice(a.prix)}
                      {a.taille && ` · ${a.taille}`}
                      {a.couleur && ` · ${a.couleur}`}
                    </p>
                  </div>
                  <span className="font-semibold">{formatPrice(a.prix * a.quantite)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-between border-t border-border pt-4 text-sm">
              <span className="text-muted">
                Livraison ({order.typeLivraison === "stopdesk" ? "Stopdesk" : "Domicile"})
              </span>
              <span className="font-semibold">{formatPrice(order.fraisLivraison)}</span>
            </div>
            <div className="mt-1 flex justify-between border-t border-border pt-4 text-base font-bold">
              <span>Total</span>
              <span className="text-accent-strong">{formatPrice(order.montant)}</span>
            </div>
          </div>

          <div className="nb-card p-5">
            <h3 className="mb-4 text-sm font-bold">Informations client</h3>
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex items-center gap-2.5">
                <User className="h-4 w-4 text-accent-strong" /> {order.clientNom}
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 text-accent-strong" /> {order.clientTelephone}
              </div>
              <div className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent-strong" />
                {order.adresse}, {order.wilaya} ({order.typeLivraison === "stopdesk" ? "Stopdesk" : "Domicile"})
              </div>
              <div className="flex items-center gap-2.5">
                <Wallet className="h-4 w-4 text-accent-strong" />
                {order.methodePaiement === "paiement_livraison" ? "Paiement à la livraison" : "Carte bancaire"}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="nb-card p-5">
            <h3 className="mb-4 text-sm font-bold">Statut de la commande</h3>
            <select
              value={order.statut}
              onChange={(e) => updateStatus(e.target.value as OrderStatus)}
              className="h-11 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-accent-strong"
            >
              {Object.entries(ORDER_STATUS_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="nb-card p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold">
              <Truck className="h-4 w-4 text-accent-strong" /> Informations de livraison
            </h3>
            <div className="flex flex-col gap-3">
              <input
                placeholder="Transporteur (ex: Yalidine)"
                value={transporteur}
                onChange={(e) => setTransporteur(e.target.value)}
                className="h-11 rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-accent-strong"
              />
              <input
                placeholder="Numéro de suivi"
                value={numeroSuivi}
                onChange={(e) => setNumeroSuivi(e.target.value)}
                className="h-11 rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-accent-strong"
              />
              <textarea
                placeholder="Notes de livraison"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent-strong"
              />
              <Button onClick={saveLivraison} disabled={saving} type="button">
                {saving ? "Enregistrement..." : "Enregistrer la livraison"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
