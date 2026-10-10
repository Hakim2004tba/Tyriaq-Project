import { getCategories } from "@/lib/server/store";
import { ProductForm } from "@/components/admin/product-form";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const categories = await getCategories();
  return (
    <div>
      <h2 className="mb-6 text-xl font-bold">Ajouter un produit</h2>
      <ProductForm categories={categories} />
    </div>
  );
}
