import { getProducts } from "@/lib/server/store";
import { ProductCard } from "@/components/site/product-card";
import { Flame } from "lucide-react";

export const metadata = { title: "Promotions — NB SPORT" };
export const dynamic = "force-dynamic";

export default async function PromotionsPage() {
  const allProducts = await getProducts();
  const products = allProducts.filter(
    (p) => p.statut === "publie" && p.prixPromo && p.prixPromo < p.prix
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="nb-card glow-border mb-10 flex flex-col items-center gap-2 bg-surface-2 p-10 text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-accent/15 px-3 py-1 text-xs font-bold text-accent-strong">
          <Flame className="h-3.5 w-3.5" /> Offres en cours
        </span>
        <h1 className="text-3xl font-black sm:text-4xl">
          Jusqu&apos;à <span className="glow-text text-accent-strong">-50%</span>
        </h1>
        <p className="max-w-md text-sm text-muted">
          Profitez de réductions exceptionnelles sur une sélection de produits sportifs.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}
