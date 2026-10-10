"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, BadgePercent } from "lucide-react";
import type { Promotion } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export default function AdminPromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [pourcentage, setPourcentage] = useState(10);
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");

  useEffect(() => {
    fetch("/api/promotions")
      .then((r) => r.json())
      .then(setPromotions);
  }, []);

  async function addPromotion(e: React.FormEvent) {
    e.preventDefault();
    if (!titre.trim()) return;
    const res = await fetch("/api/promotions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titre,
        description,
        pourcentage,
        actif: true,
        dateDebut: dateDebut ? new Date(dateDebut).toISOString() : new Date().toISOString(),
        dateFin: dateFin ? new Date(dateFin).toISOString() : new Date().toISOString(),
      }),
    });
    const created = await res.json();
    setPromotions((prev) => [created, ...prev]);
    setTitre("");
    setDescription("");
  }

  async function toggleActive(p: Promotion) {
    setPromotions((prev) => prev.map((x) => (x.id === p.id ? { ...x, actif: !x.actif } : x)));
    await fetch(`/api/promotions/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actif: !p.actif }),
    });
  }

  async function deletePromotion(id: string) {
    if (!confirm("Supprimer cette promotion ?")) return;
    setPromotions((prev) => prev.filter((p) => p.id !== id));
    await fetch(`/api/promotions/${id}`, { method: "DELETE" });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
      <div className="flex flex-col gap-4">
        {promotions.map((p) => (
          <div key={p.id} className="nb-card flex items-center justify-between p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                <BadgePercent className="h-6 w-6 text-accent-strong" />
              </div>
              <div>
                <p className="text-sm font-bold">{p.titre}</p>
                <p className="text-xs text-muted">{p.description}</p>
                <p className="mt-1 text-xs text-muted">
                  {formatDate(p.dateDebut)} → {formatDate(p.dateFin)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-lg font-black text-accent-strong">-{p.pourcentage}%</span>
              <button onClick={() => toggleActive(p)}>
                <Badge variant={p.actif ? "accent" : "neutral"}>{p.actif ? "Active" : "Inactive"}</Badge>
              </button>
              <button
                onClick={() => deletePromotion(p.id)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-danger/10 hover:text-danger"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={addPromotion} className="nb-card h-fit p-5">
        <h3 className="mb-4 text-sm font-bold">Nouvelle promotion</h3>
        <div className="flex flex-col gap-3">
          <input
            placeholder="Titre"
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            className="h-11 rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-accent-strong"
          />
          <textarea
            placeholder="Description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent-strong"
          />
          <input
            type="number"
            min={1}
            max={90}
            placeholder="Pourcentage"
            value={pourcentage}
            onChange={(e) => setPourcentage(Number(e.target.value))}
            className="h-11 rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-accent-strong"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
              className="h-11 rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-accent-strong"
            />
            <input
              type="date"
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
              className="h-11 rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-accent-strong"
            />
          </div>
          <Button type="submit">
            <Plus className="h-4 w-4" /> Créer la promotion
          </Button>
        </div>
      </form>
    </div>
  );
}
