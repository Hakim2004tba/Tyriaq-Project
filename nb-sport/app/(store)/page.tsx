import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getCategories, getProducts } from "@/lib/server/store";
import { Hero } from "@/components/site/hero";
import { CategoryCard } from "@/components/site/category-card";
import { ProductCard } from "@/components/site/product-card";
import { PromoBanner } from "@/components/site/promo-banner";
import { Features } from "@/components/site/features";
import { Reveal } from "@/components/site/reveal";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [categories, allProducts] = await Promise.all([getCategories(), getProducts()]);
  const products = allProducts.filter((p) => p.statut === "publie").slice(0, 10);

  return (
    <>
      <Hero />

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <Reveal>
          <div className="mb-8 flex items-end justify-between">
            <h2 className="text-2xl font-black sm:text-3xl">Nos catégories</h2>
          </div>
        </Reveal>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
          {categories.map((cat, i) => (
            <Reveal key={cat.id} delay={i * 50}>
              <CategoryCard category={cat} />
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
        <Reveal>
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-black sm:text-3xl">Nos derniers produits</h2>
              <p className="mt-1 text-sm text-muted">Les nouveautés et incontournables du moment</p>
            </div>
            <Link
              href="/produits"
              className="group hidden items-center gap-1.5 text-sm font-semibold text-accent-strong sm:inline-flex"
            >
              Voir tout
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </Reveal>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {products.map((product, i) => (
            <Reveal key={product.id} delay={i * 60}>
              <ProductCard product={product} />
            </Reveal>
          ))}
        </div>
        <div className="mt-8 flex justify-center sm:hidden">
          <Link
            href="/produits"
            className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-border px-5 text-sm font-semibold text-accent-strong"
          >
            Voir tous les produits <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <PromoBanner />
      <Features />
    </>
  );
}
