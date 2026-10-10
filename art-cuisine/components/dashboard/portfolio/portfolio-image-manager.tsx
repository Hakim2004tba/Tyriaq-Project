"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImagePlus, Star, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FormMessage } from "@/components/auth/form-message";
import { uploadPortfolioImages, deletePortfolioImage, setPortfolioCoverImage } from "@/lib/actions/portfolio";
import type { PortfolioImageRecord } from "@/lib/data/operations";

function PortfolioImageManager({ projectId, images }: { projectId: string; images: PortfolioImageRecord[] }) {
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  const sorted = [...images].sort((a, b) => a.order - b.order);

  async function handleFilesSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setError(null);
    setUploading(true);

    const formData = new FormData();
    for (const file of Array.from(files)) {
      formData.append("images", file);
    }

    const result = await uploadPortfolioImages(projectId, formData);

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";

    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success(files.length > 1 ? `${files.length} images ajoutées` : "Image ajoutée");
    router.refresh();
  }

  async function handleDelete(imageId: string) {
    setPendingId(imageId);
    const result = await deletePortfolioImage(projectId, imageId);
    setPendingId(null);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Image supprimée");
    router.refresh();
  }

  async function handleSetCover(imageId: string) {
    setPendingId(imageId);
    const result = await setPortfolioCoverImage(projectId, imageId);
    setPendingId(null);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Image de couverture définie");
    router.refresh();
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-text-primary">Images ({sorted.length})</h3>
        <label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFilesSelected}
            disabled={uploading}
          />
          <Button type="button" size="sm" variant="outline" disabled={uploading} asChild>
            <span className="cursor-pointer">
              <ImagePlus className="h-3.5 w-3.5" /> {uploading ? "Envoi…" : "Ajouter des images"}
            </span>
          </Button>
        </label>
      </div>

      {error && <FormMessage>{error}</FormMessage>}

      {sorted.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-muted">
          Aucune image. Une réalisation ne peut être publiée qu&rsquo;avec au moins une image.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {sorted.map((image, i) => (
            <div key={image.id} className="group relative aspect-[4/3] overflow-hidden rounded-md border border-border-subtle">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.dataUrl} alt="" className="h-full w-full object-cover" />
              {i === 0 && (
                <Badge variant="gold" className="absolute left-2 top-2">Couverture</Badge>
              )}
              <div className="absolute inset-0 flex items-end justify-end gap-1 bg-gradient-to-t from-ink-950/70 via-transparent to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                {i !== 0 && (
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-7 w-7 bg-surface"
                    disabled={pendingId === image.id}
                    onClick={() => handleSetCover(image.id)}
                    title="Définir comme couverture"
                  >
                    <Star className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="h-7 w-7"
                  disabled={pendingId === image.id}
                  onClick={() => handleDelete(image.id)}
                  title="Supprimer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export { PortfolioImageManager };
