"use client";

import Link from "next/link";
import { Heart, ShoppingCart, Star } from "lucide-react";
import { useState } from "react";
import type { Product } from "@/lib/types";
import { cn, formatPrice } from "@/lib/utils";
import { ProductVisual } from "@/components/site/product-visual";
import { useCart } from "@/lib/store/cart";

export function ProductCard({ product }: { product: Product }) {
  const add = useCart((s) => s.add);
  const [fav, setFav] = useState(false);
  const [added, setAdded] = useState(false);
  const hasPromo = !!product.prixPromo && product.prixPromo < product.prix;
  const discount = hasPromo ? Math.round(100 - (product.prixPromo! / product.prix) * 100) : 0;

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    add({
      productId: product.id,
      nom: product.nom,
      prix: product.prixPromo ?? product.prix,
      image: product.images[0],
      quantite: 1,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <Link
      href={`/produits/${product.slug}`}
      className="group nb-card glow-border relative flex flex-col overflow-hidden transition-transform duration-300 hover:-translate-y-1"
    >
      <div className="relative aspect-square w-full overflow-hidden">
        <ProductVisual
          imageKey={product.images[0]}
          className="h-full w-full transition-transform duration-500 group-hover:scale-110"
          iconClassName="h-16 w-16"
        />
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {product.nouveau && (
            <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold text-accent-foreground">
              Nouveau
            </span>
          )}
          {hasPromo && (
            <span className="rounded-full bg-black/80 px-2.5 py-1 text-[11px] font-bold text-accent dark:bg-white/10">
              -{discount}%
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            setFav((v) => !v);
          }}
          aria-label="Ajouter aux favoris"
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
        >
          <Heart className={cn("h-4 w-4", fav && "fill-accent text-accent")} />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          {product.categorieId.replace("cat-", "")}
        </span>
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{product.nom}</h3>
        <div className="flex items-center gap-1 text-xs text-muted">
          <Star className="h-3.5 w-3.5 fill-accent-strong text-accent-strong" />
          {product.note} ({product.avis})
        </div>
        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold text-accent-strong">
              {formatPrice(product.prixPromo ?? product.prix)}
            </span>
            {hasPromo && (
              <span className="text-xs text-muted line-through">{formatPrice(product.prix)}</span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className={cn(
            "mt-1 inline-flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all duration-200",
            added
              ? "bg-accent-strong text-accent-foreground"
              : "nb-gradient-accent text-accent-foreground hover:brightness-110"
          )}
        >
          <ShoppingCart className="h-4 w-4" />
          {added ? "Ajouté !" : "Ajouter au panier"}
        </button>
      </div>
    </Link>
  );
}
