import { getCategories } from "@/lib/server/store";
import { CategoryCard } from "@/components/site/category-card";

export const metadata = { title: "Catégories — NB SPORT" };
export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await getCategories();
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-black">Toutes les catégories</h1>
      <p className="mt-1 text-sm text-muted">Explorez notre gamme complète de produits sportifs</p>
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {categories.map((cat) => (
          <CategoryCard key={cat.id} category={cat} />
        ))}
      </div>
    </div>
  );
}
