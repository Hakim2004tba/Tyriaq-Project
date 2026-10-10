import { getCategories, getProducts } from "@/lib/server/store";
import { ProductsTable } from "@/components/admin/products-table";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);
  return <ProductsTable initialProducts={products} categories={categories} />;
}
