import { notFound } from "next/navigation";
import { getCategories, getProducts } from "@/lib/server/store";
import { ProductForm } from "@/components/admin/product-form";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [categories, products] = await Promise.all([getCategories(), getProducts()]);
  const product = products.find((p) => p.id === id);
  if (!product) notFound();

  return (
    <div>
      <h2 className="mb-6 text-xl font-bold">Modifier le produit</h2>
      <ProductForm categories={categories} product={product} />
    </div>
  );
}
