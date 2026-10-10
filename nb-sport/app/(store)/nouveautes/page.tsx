import { getProducts } from "@/lib/server/store";
import { ProductCard } from "@/components/site/product-card";

export const metadata = { title: "Nouveautés — NB SPORT" };
export const dynamic = "force-dynamic";

export default async function NouveautesPage() {
  const allProducts = await getProducts();
  const products = allProducts.filter((p) => p.statut === "publie" && p.nouveau);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-black">Nouveautés</h1>
      <p className="mt-1 text-sm text-muted">Les derniers arrivages NB SPORT</p>
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}
