import { notFound } from "next/navigation";
import { getCategories, getProducts } from "@/lib/server/store";
import { ProductVisual } from "@/components/site/product-visual";
import { ProductCard } from "@/components/site/product-card";
import { ProductDetailActions } from "@/components/site/product-detail-actions";
import { Star, ShieldCheck, Truck, Wallet } from "lucide-react";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [categories, products] = await Promise.all([getCategories(), getProducts()]);
  const product = products.find((p) => p.slug === slug && p.statut === "publie");
  if (!product) notFound();

  const category = categories.find((c) => c.id === product.categorieId);
  const hasPromo = !!product.prixPromo && product.prixPromo < product.prix;
  const related = products
    .filter((p) => p.categorieId === product.categorieId && p.id !== product.id && p.statut === "publie")
    .slice(0, 4);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div className="nb-card glow-border aspect-square overflow-hidden">
          <ProductVisual imageKey={product.images[0]} className="h-full w-full" iconClassName="h-28 w-28" />
        </div>

        <div>
          {category && (
            <span className="text-xs font-semibold uppercase tracking-wide text-accent-strong">{category.nom}</span>
          )}
          <h1 className="mt-2 text-3xl font-black leading-tight">{product.nom}</h1>
          <div className="mt-3 flex items-center gap-2 text-sm text-muted">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-accent-strong text-accent-strong" />
              {product.note}
            </div>
            <span>·</span>
            <span>{product.avis} avis</span>
            <span>·</span>
            <span className={product.stock > 0 ? "text-accent-strong" : "text-danger"}>
              {product.stock > 0 ? "En stock" : "Rupture de stock"}
            </span>
          </div>

          <div className="mt-5 flex items-baseline gap-3">
            <span className="text-3xl font-black text-accent-strong">
              {new Intl.NumberFormat("fr-FR").format(product.prixPromo ?? product.prix)} DA
            </span>
            {hasPromo && (
              <span className="text-base text-muted line-through">
                {new Intl.NumberFormat("fr-FR").format(product.prix)} DA
              </span>
            )}
          </div>

          <p className="mt-5 text-sm leading-relaxed text-muted">{product.description}</p>

          <ProductDetailActions product={product} />

          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="nb-card flex items-center gap-2.5 p-3.5">
              <ShieldCheck className="h-5 w-5 shrink-0 text-accent-strong" />
              <span className="text-xs font-medium">Produit authentique</span>
            </div>
            <div className="nb-card flex items-center gap-2.5 p-3.5">
              <Truck className="h-5 w-5 shrink-0 text-accent-strong" />
              <span className="text-xs font-medium">Livraison rapide</span>
            </div>
            <div className="nb-card flex items-center gap-2.5 p-3.5">
              <Wallet className="h-5 w-5 shrink-0 text-accent-strong" />
              <span className="text-xs font-medium">Paiement à la livraison</span>
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <div className="mt-16">
          <h2 className="mb-6 text-2xl font-black">Produits similaires</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
