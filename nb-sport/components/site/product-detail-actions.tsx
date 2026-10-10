"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShoppingCart, Zap } from "lucide-react";
import type { Product } from "@/lib/types";
import { useCart } from "@/lib/store/cart";
import { cn } from "@/lib/utils";

export function ProductDetailActions({ product }: { product: Product }) {
  const add = useCart((s) => s.add);
  const router = useRouter();
  const [taille, setTaille] = useState(product.tailles[0] ?? undefined);
  const [couleur, setCouleur] = useState(product.couleurs[0] ?? undefined);
  const [quantite, setQuantite] = useState(1);
  const [added, setAdded] = useState(false);

  function buildItem() {
    return {
      productId: product.id,
      nom: product.nom,
      prix: product.prixPromo ?? product.prix,
      image: product.images[0],
      quantite,
      taille,
      couleur,
    };
  }

  function handleAdd() {
    add(buildItem());
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  function handleBuyNow() {
    add(buildItem());
    router.push("/panier");
  }

  return (
    <div className="mt-6 flex flex-col gap-5">
      {product.tailles.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Taille</p>
          <div className="flex flex-wrap gap-2">
            {product.tailles.map((t) => (
              <button
                key={t}
                onClick={() => setTaille(t)}
                className={cn(
                  "h-10 min-w-10 rounded-lg border px-3 text-sm font-semibold transition-colors",
                  taille === t
                    ? "border-accent-strong bg-accent/10 text-accent-strong"
                    : "border-border text-muted hover:border-accent-strong"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {product.couleurs.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Couleur</p>
          <div className="flex flex-wrap gap-2">
            {product.couleurs.map((c) => (
              <button
                key={c}
                onClick={() => setCouleur(c)}
                className={cn(
                  "rounded-lg border px-3.5 py-2 text-sm font-semibold transition-colors",
                  couleur === c
                    ? "border-accent-strong bg-accent/10 text-accent-strong"
                    : "border-border text-muted hover:border-accent-strong"
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Quantité</p>
        <div className="inline-flex items-center rounded-lg border border-border">
          <button
            onClick={() => setQuantite((q) => Math.max(1, q - 1))}
            className="flex h-10 w-10 items-center justify-center text-muted hover:text-accent-strong"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="flex h-10 w-10 items-center justify-center text-sm font-semibold">{quantite}</span>
          <button
            onClick={() => setQuantite((q) => q + 1)}
            className="flex h-10 w-10 items-center justify-center text-muted hover:text-accent-strong"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          onClick={handleAdd}
          disabled={product.stock === 0}
          className={cn(
            "inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50",
            added ? "bg-accent-strong text-accent-foreground" : "nb-gradient-accent text-accent-foreground hover:brightness-110"
          )}
        >
          <ShoppingCart className="h-4 w-4" />
          {added ? "Ajouté au panier !" : "Ajouter au panier"}
        </button>
        <button
          onClick={handleBuyNow}
          disabled={product.stock === 0}
          className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-accent-strong text-sm font-bold text-accent-strong transition-colors hover:bg-accent/10 disabled:opacity-50"
        >
          <Zap className="h-4 w-4" />
          Acheter maintenant
        </button>
      </div>
    </div>
  );
}
