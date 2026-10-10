"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Upload, X } from "lucide-react";
import type { Category, Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ProductVisual } from "@/components/site/product-visual";

async function uploadImage(file: File, folder: string): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);
  const res = await fetch("/api/upload", { method: "POST", body: formData });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Échec de l'envoi");
  return data.url as string;
}

export function ProductForm({
  categories,
  product,
}: {
  categories: Category[];
  product?: Product;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [nom, setNom] = useState(product?.nom ?? "");
  const [categorieId, setCategorieId] = useState(product?.categorieId ?? categories[0]?.id ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [prix, setPrix] = useState(product?.prix ?? 0);
  const [prixPromo, setPrixPromo] = useState(product?.prixPromo ?? "");
  const [stock, setStock] = useState(product?.stock ?? 0);
  const [statut, setStatut] = useState(product?.statut ?? "publie");
  const [nouveau, setNouveau] = useState(product?.nouveau ?? false);
  const [tailles, setTailles] = useState<string[]>(product?.tailles ?? []);
  const [couleurs, setCouleurs] = useState<string[]>(product?.couleurs ?? []);
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [tailleInput, setTailleInput] = useState("");
  const [couleurInput, setCouleurInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function addTaille() {
    if (tailleInput.trim()) setTailles((t) => [...t, tailleInput.trim()]);
    setTailleInput("");
  }
  function addCouleur() {
    if (couleurInput.trim()) setCouleurs((c) => [...c, couleurInput.trim()]);
    setCouleurInput("");
  }
  function removeImage(url: string) {
    setImages((imgs) => imgs.filter((i) => i !== url));
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    setUploading(true);
    setUploadError("");
    try {
      const uploaded = await Promise.all(Array.from(fileList).map((f) => uploadImage(f, "produits")));
      setImages((imgs) => [...imgs, ...uploaded]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Échec de l'envoi");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      nom,
      categorieId,
      description,
      prix: Number(prix),
      prixPromo: prixPromo === "" ? null : Number(prixPromo),
      stock: Number(stock),
      statut,
      nouveau,
      tailles,
      couleurs,
      images: images.length ? images : ["placeholder"],
    };
    try {
      if (product) {
        await fetch(`/api/products/${product.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      router.push("/admin/produits");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr]">
      <div className="flex flex-col gap-5">
        <div className="nb-card p-5">
          <h3 className="mb-4 text-sm font-bold">Informations générales</h3>
          <div className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted">Nom du produit</label>
              <input
                required
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className="h-11 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-accent-strong"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted">Description</label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent-strong"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted">Catégorie</label>
              <select
                value={categorieId}
                onChange={(e) => setCategorieId(e.target.value)}
                className="h-11 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-accent-strong"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="nb-card p-5">
          <h3 className="mb-4 text-sm font-bold">Prix et stock</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted">Prix (DA)</label>
              <input
                required
                type="number"
                min={0}
                value={prix}
                onChange={(e) => setPrix(Number(e.target.value))}
                className="h-11 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-accent-strong"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted">Prix promo (DA)</label>
              <input
                type="number"
                min={0}
                value={prixPromo}
                onChange={(e) => setPrixPromo(e.target.value === "" ? "" : Number(e.target.value))}
                className="h-11 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-accent-strong"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted">Stock</label>
              <input
                required
                type="number"
                min={0}
                value={stock}
                onChange={(e) => setStock(Number(e.target.value))}
                className="h-11 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-accent-strong"
              />
            </div>
          </div>
        </div>

        <div className="nb-card p-5">
          <h3 className="mb-4 text-sm font-bold">Tailles et couleurs</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted">Tailles</label>
              <div className="mb-2 flex flex-wrap gap-2">
                {tailles.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-xs">
                    {t}
                    <button type="button" onClick={() => setTailles((arr) => arr.filter((x) => x !== t))}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={tailleInput}
                  onChange={(e) => setTailleInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTaille())}
                  placeholder="ex: 42"
                  className="h-9 flex-1 rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-accent-strong"
                />
                <button type="button" onClick={addTaille} className="flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:border-accent-strong">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted">Couleurs</label>
              <div className="mb-2 flex flex-wrap gap-2">
                {couleurs.map((c) => (
                  <span key={c} className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-xs">
                    {c}
                    <button type="button" onClick={() => setCouleurs((arr) => arr.filter((x) => x !== c))}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={couleurInput}
                  onChange={(e) => setCouleurInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCouleur())}
                  placeholder="ex: Noir"
                  className="h-9 flex-1 rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-accent-strong"
                />
                <button type="button" onClick={addCouleur} className="flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:border-accent-strong">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        <div className="nb-card p-5">
          <h3 className="mb-4 text-sm font-bold">Images du produit</h3>
          <p className="mb-3 text-xs text-muted">Ajoutez une ou plusieurs photos (JPG, PNG, WEBP — 5 Mo max).</p>
          {images.length > 0 && (
            <div className="mb-3 grid grid-cols-4 gap-2">
              {images.map((url) => (
                <div key={url} className="group relative aspect-square overflow-hidden rounded-lg">
                  <ProductVisual imageKey={url} className="h-full w-full" iconClassName="h-6 w-6" />
                  <button
                    type="button"
                    onClick={() => removeImage(url)}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border text-sm font-medium text-muted transition-colors hover:border-accent-strong hover:text-accent-strong disabled:opacity-60"
          >
            <Upload className="h-4 w-4" />
            {uploading ? "Envoi en cours..." : "Ajouter des images"}
          </button>
          {uploadError && <p className="mt-2 text-xs text-danger">{uploadError}</p>}
        </div>

        <div className="nb-card p-5">
          <h3 className="mb-4 text-sm font-bold">Publication</h3>
          <div className="flex flex-col gap-3">
            <label className="flex items-center justify-between text-sm">
              Statut
              <select
                value={statut}
                onChange={(e) => setStatut(e.target.value as "publie" | "masque")}
                className="h-9 rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-accent-strong"
              >
                <option value="publie">Publié</option>
                <option value="masque">Masqué</option>
              </select>
            </label>
            <label className="flex items-center justify-between text-sm">
              Marquer comme nouveau
              <input type="checkbox" checked={nouveau} onChange={(e) => setNouveau(e.target.checked)} className="h-4 w-4 accent-[var(--accent-strong)]" />
            </label>
          </div>
        </div>

        <Button type="submit" size="lg" disabled={saving} className="w-full">
          {saving ? "Enregistrement..." : product ? "Enregistrer les modifications" : "Créer le produit"}
        </Button>
      </div>
    </form>
  );
}
