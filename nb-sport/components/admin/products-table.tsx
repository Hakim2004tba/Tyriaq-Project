"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Eye, EyeOff, Plus } from "lucide-react";
import type { Category, Product } from "@/lib/types";
import { ProductVisual } from "@/components/site/product-visual";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";

export function ProductsTable({
  initialProducts,
  categories,
}: {
  initialProducts: Product[];
  categories: Category[];
}) {
  const [products, setProducts] = useState(initialProducts);
  const router = useRouter();
  const catName = (id: string) => categories.find((c) => c.id === id)?.nom ?? "—";

  async function toggleStatus(p: Product) {
    const statut = p.statut === "publie" ? "masque" : "publie";
    setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, statut } : x)));
    await fetch(`/api/products/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut }),
    });
    router.refresh();
  }

  async function deleteProduct(id: string) {
    if (!confirm("Supprimer définitivement ce produit ?")) return;
    setProducts((prev) => prev.filter((p) => p.id !== id));
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="nb-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border p-4">
        <p className="text-sm text-muted">{products.length} produits</p>
        <Link href="/admin/produits/nouveau">
          <Button size="sm">
            <Plus className="h-4 w-4" /> Ajouter un produit
          </Button>
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-semibold">Produit</th>
              <th className="px-4 py-3 font-semibold">Catégorie</th>
              <th className="px-4 py-3 font-semibold">Prix</th>
              <th className="px-4 py-3 font-semibold">Stock</th>
              <th className="px-4 py-3 font-semibold">Statut</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface-2/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg">
                      <ProductVisual imageKey={p.images[0]} className="h-full w-full" iconClassName="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{p.nom}</p>
                      {p.nouveau && <Badge variant="accent" className="mt-1">Nouveau</Badge>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted">{catName(p.categorieId)}</td>
                <td className="px-4 py-3">
                  <p className="font-semibold">{formatPrice(p.prixPromo ?? p.prix)}</p>
                  {p.prixPromo && <p className="text-xs text-muted line-through">{formatPrice(p.prix)}</p>}
                </td>
                <td className="px-4 py-3">
                  <span className={p.stock > 5 ? "text-foreground" : "text-danger font-semibold"}>{p.stock}</span>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={p.statut === "publie" ? "accent" : "neutral"}>
                    {p.statut === "publie" ? "Publié" : "Masqué"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => toggleStatus(p)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-accent-strong"
                      title={p.statut === "publie" ? "Masquer" : "Publier"}
                    >
                      {p.statut === "publie" ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <Link
                      href={`/admin/produits/${p.id}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-accent-strong"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => deleteProduct(p.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-danger/10 hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
