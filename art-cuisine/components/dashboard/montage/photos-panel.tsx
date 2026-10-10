"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, Upload } from "lucide-react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { FormMessage } from "@/components/auth/form-message";
import { uploadMontagePhoto } from "@/lib/actions/montage";
import { MONTAGE_PHOTO_PHASES } from "@/lib/data/montage";
import { formatShortDate } from "@/lib/format";
import type { MontagePhotoRecord, MontagePhotoPhase } from "@/lib/data/operations";

const MAX_FILE_BYTES = 8 * 1024 * 1024;

function UploadPhotoDialog({ jobId, defaultPhase }: { jobId: string; defaultPhase: MontagePhotoPhase }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement | null;
    const file = fileInput?.files?.[0];
    if (!file) {
      setError("Merci de sélectionner un fichier.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("Le fichier dépasse la taille maximale autorisée (8 Mo).");
      return;
    }

    setSubmitting(true);
    const formData = new FormData(form);
    const result = await uploadMontagePhoto(jobId, formData);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("Photo ajoutée");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setError(null); }}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          <Camera className="h-3.5 w-3.5" /> Ajouter une photo
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Ajouter une photo</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-5 px-7 py-6">
            {error && <FormMessage>{error}</FormMessage>}
            <div className="flex flex-col gap-2">
              <Label>Phase</Label>
              <Select name="phase" defaultValue={defaultPhase}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTAGE_PHOTO_PHASES.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="mphoto-file">Fichier (8 Mo max)</Label>
              <input
                id="mphoto-file"
                name="file"
                type="file"
                accept="image/*"
                className="focus-ring flex h-11 w-full items-center rounded-md border border-border-default bg-surface-raised px-3.5 text-sm text-text-secondary file:mr-3 file:rounded-sm file:border-0 file:bg-surface-sunken file:px-3 file:py-1.5 file:text-xs file:font-medium"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="mphoto-caption">Légende (optionnel)</Label>
              <Input id="mphoto-caption" name="caption" placeholder="Ex : Caissons hauts avant pose du plan de travail" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">Annuler</Button>
            </DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Envoi…" : <><Upload className="h-3.5 w-3.5" /> Ajouter</>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PhotosPanel({ jobId, photos }: { jobId: string; photos: MontagePhotoRecord[] }) {
  return (
    <div className="flex flex-col gap-6">
      {MONTAGE_PHOTO_PHASES.map((phase) => {
        const phasePhotos = photos.filter((p) => p.phase === phase);
        return (
          <div key={phase} className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-text-primary">{phase} ({phasePhotos.length})</p>
              <UploadPhotoDialog jobId={jobId} defaultPhase={phase} />
            </div>
            {phasePhotos.length === 0 ? (
              <p className="py-4 text-center text-sm text-text-muted">Aucune photo « {phase} ».</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {phasePhotos.map((photo) => (
                  <div key={photo.id} className="flex flex-col gap-1.5 overflow-hidden rounded-md border border-border-subtle bg-surface-sunken">
                    <div className="flex aspect-square items-center justify-center overflow-hidden bg-stone-100">
                      {photo.dataUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photo.dataUrl} alt={photo.caption ?? phase} className="h-full w-full object-cover" />
                      ) : (
                        <Camera className="h-6 w-6 text-text-muted" />
                      )}
                    </div>
                    <div className="px-2 pb-2">
                      {photo.caption && <p className="truncate text-xs font-medium text-text-secondary">{photo.caption}</p>}
                      <p className="truncate text-[0.6875rem] text-text-muted">{formatShortDate(photo.uploadedAt)} · {photo.uploadedBy}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export { PhotosPanel };
