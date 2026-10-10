"use client";

import { useState } from "react";
import { Save, Store, Truck, CreditCard, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminSettingsPage() {
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    nom: "NB SPORT",
    email: "contact@nbsport.dz",
    telephone: "+213 555 00 00 00",
    adresse: "Alger, Algérie",
    fraisLivraison: 500,
    delaiLivraison: "2 à 5 jours ouvrés",
    paiementLivraison: true,
    notificationsNouvelleCommande: true,
  });

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <form onSubmit={handleSave} className="mx-auto flex max-w-3xl flex-col gap-5">
      <div className="nb-card p-5">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold">
          <Store className="h-4 w-4 text-accent-strong" /> Informations de la boutique
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <input
            value={form.nom}
            onChange={(e) => setForm({ ...form, nom: e.target.value })}
            placeholder="Nom de la boutique"
            className="h-11 rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-accent-strong"
          />
          <input
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="Email"
            className="h-11 rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-accent-strong"
          />
          <input
            value={form.telephone}
            onChange={(e) => setForm({ ...form, telephone: e.target.value })}
            placeholder="Téléphone"
            className="h-11 rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-accent-strong"
          />
          <input
            value={form.adresse}
            onChange={(e) => setForm({ ...form, adresse: e.target.value })}
            placeholder="Adresse"
            className="h-11 rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-accent-strong"
          />
        </div>
      </div>

      <div className="nb-card p-5">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold">
          <Truck className="h-4 w-4 text-accent-strong" /> Livraison
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted">Frais de livraison (DA)</label>
            <input
              type="number"
              value={form.fraisLivraison}
              onChange={(e) => setForm({ ...form, fraisLivraison: Number(e.target.value) })}
              className="h-11 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-accent-strong"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted">Délai de livraison</label>
            <input
              value={form.delaiLivraison}
              onChange={(e) => setForm({ ...form, delaiLivraison: e.target.value })}
              className="h-11 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-accent-strong"
            />
          </div>
        </div>
      </div>

      <div className="nb-card p-5">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold">
          <CreditCard className="h-4 w-4 text-accent-strong" /> Paiement
        </h3>
        <label className="flex items-center justify-between text-sm">
          Activer le paiement à la livraison
          <input
            type="checkbox"
            checked={form.paiementLivraison}
            onChange={(e) => setForm({ ...form, paiementLivraison: e.target.checked })}
            className="h-4 w-4 accent-[var(--accent-strong)]"
          />
        </label>
      </div>

      <div className="nb-card p-5">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold">
          <Bell className="h-4 w-4 text-accent-strong" /> Notifications
        </h3>
        <label className="flex items-center justify-between text-sm">
          Recevoir une notification à chaque nouvelle commande
          <input
            type="checkbox"
            checked={form.notificationsNouvelleCommande}
            onChange={(e) => setForm({ ...form, notificationsNouvelleCommande: e.target.checked })}
            className="h-4 w-4 accent-[var(--accent-strong)]"
          />
        </label>
      </div>

      <Button type="submit" size="lg">
        <Save className="h-4 w-4" /> {saved ? "Enregistré !" : "Enregistrer les paramètres"}
      </Button>
    </form>
  );
}
