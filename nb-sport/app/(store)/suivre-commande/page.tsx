"use client";

import { useState } from "react";
import { PackageSearch, Search, Truck, CheckCircle2, Clock, XCircle, PackagePlus } from "lucide-react";
import type { Order, OrderStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn, formatDate, formatPrice } from "@/lib/utils";

const STEPS: { key: OrderStatus; label: string; icon: typeof Clock }[] = [
  { key: "nouvelle", label: "Nouvelle commande", icon: PackagePlus },
  { key: "preparation", label: "En préparation", icon: Clock },
  { key: "expediee", label: "Expédiée", icon: Truck },
  { key: "livree", label: "Livrée", icon: CheckCircle2 },
];

export default function SuivreCommandePage() {
  const [numero, setNumero] = useState("");
  const [telephone, setTelephone] = useState("");
  const [order, setOrder] = useState<Order | null | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/orders");
      const orders: Order[] = await res.json();
      const found = orders.find(
        (o) => o.numero.toLowerCase() === numero.trim().toLowerCase() && o.clientTelephone.replace(/\s/g, "") === telephone.replace(/\s/g, "")
      );
      setOrder(found ?? null);
    } finally {
      setLoading(false);
    }
  }

  const activeIndex = order ? STEPS.findIndex((s) => s.key === order.statut) : -1;

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="text-center">
        <PackageSearch className="mx-auto h-10 w-10 text-accent-strong" />
        <h1 className="mt-3 text-3xl font-black">Suivre ma commande</h1>
        <p className="mt-1 text-sm text-muted">
          Entrez votre numéro de commande et votre téléphone pour suivre son statut.
        </p>
      </div>

      <form onSubmit={handleSearch} className="nb-card glow-border mt-8 flex flex-col gap-3 p-6">
        <input
          required
          placeholder="Numéro de commande (ex: NB-1024)"
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
          className="h-11 rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-accent-strong"
        />
        <input
          required
          placeholder="Numéro de téléphone"
          value={telephone}
          onChange={(e) => setTelephone(e.target.value)}
          className="h-11 rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-accent-strong"
        />
        <Button type="submit" disabled={loading} className="mt-1">
          <Search className="h-4 w-4" />
          {loading ? "Recherche..." : "Suivre ma commande"}
        </Button>
      </form>

      {order === null && (
        <div className="mt-8 flex flex-col items-center gap-2 text-center text-muted">
          <XCircle className="h-8 w-8" />
          <p>Aucune commande trouvée avec ces informations.</p>
        </div>
      )}

      {order && (
        <div className="nb-card glow-border mt-8 p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted">Commande</p>
              <p className="text-lg font-black text-accent-strong">{order.numero}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted">{formatDate(order.creeLe)}</p>
              <p className="text-sm font-bold">{formatPrice(order.montant)}</p>
            </div>
          </div>

          {order.statut === "annulee" ? (
            <div className="flex items-center gap-2 rounded-lg bg-danger/10 p-4 text-sm font-semibold text-danger">
              <XCircle className="h-5 w-5" /> Cette commande a été annulée.
            </div>
          ) : (
            <div className="flex items-center justify-between">
              {STEPS.map((step, i) => (
                <div key={step.key} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex w-full items-center">
                    <div
                      className={cn(
                        "h-0.5 flex-1",
                        i === 0 ? "opacity-0" : i <= activeIndex ? "bg-accent-strong" : "bg-border"
                      )}
                    />
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2",
                        i <= activeIndex
                          ? "border-accent-strong bg-accent/15 text-accent-strong"
                          : "border-border text-muted"
                      )}
                    >
                      <step.icon className="h-4 w-4" />
                    </div>
                    <div
                      className={cn(
                        "h-0.5 flex-1",
                        i === STEPS.length - 1 ? "opacity-0" : i < activeIndex ? "bg-accent-strong" : "bg-border"
                      )}
                    />
                  </div>
                  <span className={cn("text-center text-[11px] font-medium", i <= activeIndex ? "text-foreground" : "text-muted")}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 space-y-2 border-t border-border pt-5">
            {order.articles.map((a) => (
              <div key={a.productId} className="flex justify-between text-sm">
                <span className="text-muted">
                  {a.quantite}x {a.nom}
                </span>
                <span className="font-medium">{formatPrice(a.prix * a.quantite)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
