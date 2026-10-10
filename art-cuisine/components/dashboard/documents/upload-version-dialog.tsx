"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { History } from "lucide-react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormMessage } from "@/components/auth/form-message";
import { uploadDocumentVersion } from "@/lib/actions/documents";

function UploadVersionDialog({ documentId, currentVersion }: { documentId: string; currentVersion: number }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement | null;
    if (!fileInput?.files?.[0]) {
      setError("Merci de sélectionner un fichier.");
      return;
    }

    setSubmitting(true);
    const result = await uploadDocumentVersion(documentId, new FormData(form));
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    toast.success(`Version ${currentVersion + 1} ajoutée`);
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <History className="h-3.5 w-3.5" /> Nouvelle version
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Ajouter une nouvelle version</DialogTitle>
            <DialogDescription>
              La version {currentVersion} actuelle est conservée dans l&rsquo;historique.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-5 px-7 py-6">
            {error && <FormMessage>{error}</FormMessage>}

            <div className="flex flex-col gap-2">
              <Label htmlFor="version-file">Fichier (8 Mo max)</Label>
              <input
                id="version-file"
                name="file"
                type="file"
                required
                className="focus-ring flex h-11 w-full items-center rounded-md border border-border-default bg-surface-raised px-3.5 text-sm text-text-secondary file:mr-3 file:rounded-sm file:border-0 file:bg-surface-sunken file:px-3 file:py-1.5 file:text-xs file:font-medium"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="version-note">Ce qui a changé (optionnel)</Label>
              <Textarea id="version-note" name="note" placeholder="Ex : montant corrigé, plan mis à jour après retour client…" />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">Annuler</Button>
            </DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Envoi…" : "Ajouter la version"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { UploadVersionDialog };
