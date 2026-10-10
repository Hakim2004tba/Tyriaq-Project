import { getCategories, getProducts } from "@/lib/server/store";
import { ProductVisual } from "@/components/site/product-visual";
import { ImageOff } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminMediasPage() {
  const [cats, products] = await Promise.all([getCategories(), getProducts()]);

  const entries = new Map<string, number>();
  for (const p of products) {
    for (const img of p.images) {
      if (img.startsWith("http")) entries.set(img, (entries.get(img) ?? 0) + 1);
    }
  }
  for (const c of cats) {
    if (c.image) entries.set(c.image, (entries.get(c.image) ?? 0) + 1);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="nb-card p-5 text-sm text-muted">
        Images réellement envoyées depuis les fiches produits et catégories. Pour en ajouter, ouvrez un
        produit ou une catégorie et utilisez le bouton « Ajouter des images ».
      </div>
      {entries.size === 0 ? (
        <div className="flex flex-col items-center gap-3 py-24 text-center text-muted">
          <ImageOff className="h-10 w-10" />
          <p>Aucune image envoyée pour le moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {[...entries.entries()].map(([url, count]) => (
            <div key={url} className="nb-card overflow-hidden">
              <div className="aspect-square">
                <ProductVisual imageKey={url} className="h-full w-full" iconClassName="h-10 w-10" />
              </div>
              <div className="p-2 text-center">
                <p className="text-[11px] text-muted">{count} utilisation(s)</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
