"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2, CheckCircle2 } from "lucide-react";
import { useCart } from "@/lib/store/cart";
import { ProductVisual } from "@/components/site/product-visual";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { WILAYA_RATES, getWilayaRate } from "@/lib/data/delivery-rates";

export default function PanierPage() {
  const { items, remove, setQuantite, clear, total } = useCart();
  const [mounted, setMounted] = useState(false);
  const [confirmed, setConfirmed] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    clientNom: "",
    clientTelephone: "",
    adresse: "",
    wilaya: WILAYA_RATES[0].nom,
    typeLivraison: "domicile" as "domicile" | "stopdesk",
  });

  useEffect(() => setMounted(true), []);

  const rate = getWilayaRate(form.wilaya);
  const stopdeskDisponible = rate?.stopdesk != null;
  const typeLivraison = form.typeLivraison === "stopdesk" && stopdeskDisponible ? "stopdesk" : "domicile";
  const fraisLivraison = rate ? (typeLivraison === "stopdesk" ? rate.stopdesk! : rate.domicile) : 0;

  function setWilaya(wilaya: string) {
    const r = getWilayaRate(wilaya);
    setForm((f) => ({ ...f, wilaya, typeLivraison: r?.stopdesk != null ? f.typeLivraison : "domicile" }));
  }

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          typeLivraison,
          methodePaiement: "paiement_livraison",
          montant: total() + fraisLivraison,
          articles: items.map((i) => ({
            productId: i.productId,
            nom: i.nom,
            prix: i.prix,
            quantite: i.quantite,
            taille: i.taille,
            couleur: i.couleur,
          })),
        }),
      });
      const order = await res.json();
      setConfirmed(order.numero);
      clear();
    } finally {
      setSubmitting(false);
    }
  }

  if (!mounted) return null;

  if (confirmed) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
        <CheckCircle2 className="h-16 w-16 text-accent-strong" />
        <h1 className="text-2xl font-black">Commande confirmée !</h1>
        <p className="text-sm text-muted">
          Votre commande <span className="font-bold text-accent-strong">{confirmed}</span> a bien été enregistrée.
          Notre équipe vous contactera pour la livraison.
        </p>
        <Link href="/produits">
          <Button>Continuer mes achats</Button>
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
        <ShoppingBag className="h-16 w-16 text-muted" />
        <h1 className="text-2xl font-black">Votre panier est vide</h1>
        <p className="text-sm text-muted">Découvrez nos produits et commencez vos achats.</p>
        <Link href="/produits">
          <Button>Voir les produits</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-3xl font-black">Mon panier</h1>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-4">
          {items.map((item) => (
            <div key={`${item.productId}-${item.taille}-${item.couleur}`} className="nb-card flex gap-4 p-4">
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg">
                <ProductVisual imageKey={item.image} className="h-full w-full" iconClassName="h-10 w-10" />
              </div>
              <div className="flex flex-1 flex-col justify-between">
                <div>
                  <p className="text-sm font-semibold">{item.nom}</p>
                  <p className="text-xs text-muted">
                    {[item.taille, item.couleur].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center rounded-lg border border-border">
                    <button
                      onClick={() => setQuantite(item.productId, item.quantite - 1, item.taille, item.couleur)}
                      className="flex h-8 w-8 items-center justify-center text-muted hover:text-accent-strong"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="flex h-8 w-8 items-center justify-center text-sm font-semibold">
                      {item.quantite}
                    </span>
                    <button
                      onClick={() => setQuantite(item.productId, item.quantite + 1, item.taille, item.couleur)}
                      className="flex h-8 w-8 items-center justify-center text-muted hover:text-accent-strong"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <span className="text-sm font-bold text-accent-strong">
                    {formatPrice(item.prix * item.quantite)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => remove(item.productId, item.taille, item.couleur)}
                className="h-fit text-muted hover:text-danger"
                aria-label="Supprimer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="nb-card glow-border h-fit p-6">
          <h2 className="mb-4 text-lg font-bold">Informations de livraison</h2>
          <form onSubmit={handleCheckout} className="flex flex-col gap-3">
            <input
              required
              placeholder="Nom complet"
              value={form.clientNom}
              onChange={(e) => setForm({ ...form, clientNom: e.target.value })}
              className="h-11 rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-accent-strong"
            />
            <input
              required
              placeholder="Numéro de téléphone"
              value={form.clientTelephone}
              onChange={(e) => setForm({ ...form, clientTelephone: e.target.value })}
              className="h-11 rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-accent-strong"
            />
            <select
              value={form.wilaya}
              onChange={(e) => setWilaya(e.target.value)}
              className="h-11 rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-accent-strong"
            >
              {WILAYA_RATES.map((w) => (
                <option key={w.code} value={w.nom}>
                  {String(w.code).padStart(2, "0")} — {w.nom}
                </option>
              ))}
            </select>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted">Mode de livraison</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, typeLivraison: "domicile" })}
                  className={`flex flex-col items-center gap-0.5 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                    typeLivraison === "domicile" ? "border-accent-strong bg-accent/10" : "border-border"
                  }`}
                >
                  <span className="font-semibold">À domicile</span>
                  <span className="text-xs text-muted">{rate ? formatPrice(rate.domicile) : "—"}</span>
                </button>
                <button
                  type="button"
                  disabled={!stopdeskDisponible}
                  onClick={() => setForm({ ...form, typeLivraison: "stopdesk" })}
                  className={`flex flex-col items-center gap-0.5 rounded-lg border px-3 py-2.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    typeLivraison === "stopdesk" ? "border-accent-strong bg-accent/10" : "border-border"
                  }`}
                >
                  <span className="font-semibold">Stopdesk</span>
                  <span className="text-xs text-muted">
                    {stopdeskDisponible ? formatPrice(rate!.stopdesk!) : "Indisponible"}
                  </span>
                </button>
              </div>
            </div>

            <textarea
              required
              placeholder="Adresse complète"
              value={form.adresse}
              onChange={(e) => setForm({ ...form, adresse: e.target.value })}
              rows={3}
              className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent-strong"
            />

            <div className="mt-2 flex items-center justify-between border-t border-border pt-4 text-sm">
              <span className="text-muted">Sous-total</span>
              <span className="font-semibold">{formatPrice(total())}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Livraison ({typeLivraison === "domicile" ? "domicile" : "stopdesk"})</span>
              <span className="font-semibold text-accent-strong">{formatPrice(fraisLivraison)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-4 text-base font-bold">
              <span>Total</span>
              <span className="text-accent-strong">{formatPrice(total() + fraisLivraison)}</span>
            </div>

            <Button type="submit" size="lg" disabled={submitting} className="mt-3 w-full">
              {submitting ? "Validation..." : "Valider ma commande"}
            </Button>
            <p className="text-center text-xs text-muted">Paiement à la livraison · Simple et sécurisé</p>
          </form>
        </div>
      </div>
    </div>
  );
}
