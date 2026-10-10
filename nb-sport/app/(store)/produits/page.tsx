import { getCategories, getProducts } from "@/lib/server/store";
import { ProductCard } from "@/components/site/product-card";
import { ProductsFilterBar } from "@/components/site/products-filter-bar";
import { PackageSearch } from "lucide-react";

export const metadata = { title: "Produits — NB SPORT" };

export default async function ProduitsPage({
  searchParams,
}: {
  searchParams: Promise<{ categorie?: string; tri?: string; q?: string }>;
}) {
  const { categorie, tri, q } = await searchParams;
  const [categories, allProducts] = await Promise.all([getCategories(), getProducts()]);
  let products = allProducts.filter((p) => p.statut === "publie");

  if (categorie) {
    const cat = categories.find((c) => c.slug === categorie);
    if (cat) products = products.filter((p) => p.categorieId === cat.id);
  }
  if (q) {
    const needle = q.toLowerCase();
    products = products.filter((p) => p.nom.toLowerCase().includes(needle));
  }
  if (tri === "prix-asc") products = [...products].sort((a, b) => (a.prixPromo ?? a.prix) - (b.prixPromo ?? b.prix));
  if (tri === "prix-desc") products = [...products].sort((a, b) => (b.prixPromo ?? b.prix) - (a.prixPromo ?? a.prix));
  if (tri === "nouveaute") products = [...products].sort((a, b) => +b.nouveau - +a.nouveau);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black">Tous nos produits</h1>
        <p className="mt-1 text-sm text-muted">{products.length} produits disponibles</p>
      </div>
      <div className="mb-8">
        <ProductsFilterBar categories={categories} />
      </div>
      {products.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-24 text-center text-muted">
          <PackageSearch className="h-12 w-12" />
          <p>Aucun produit ne correspond à votre recherche.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
