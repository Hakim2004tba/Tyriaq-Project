"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import type { ReactNode } from "react";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { FormMessage } from "@/components/auth/form-message";
import { DOCUMENT_CATEGORIES } from "@/lib/data/documents";
import { uploadDocument } from "@/lib/actions/documents";

const MAX_FILE_BYTES = 8 * 1024 * 1024;

interface PersonOption {
  id: string;
  name: string;
}

interface LabelOption {
  id: string;
  label: string;
}

interface ProjectOption {
  ref: string;
  label: string;
}

function UploadDocumentDialog({
  trigger,
  lockedClientId,
  lockedClientName,
  lockedDevisId,
  lockedProjectRef,
  clients,
  devisOptions,
  projectOptions,
}: {
  trigger: ReactNode;
  lockedClientId?: string;
  lockedClientName?: string;
  lockedDevisId?: string;
  lockedProjectRef?: string;
  clients?: PersonOption[];
  devisOptions?: LabelOption[];
  projectOptions?: ProjectOption[];
}) {
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
    if (file && file.size > MAX_FILE_BYTES) {
      setError("Le fichier dépasse la taille maximale autorisée (8 Mo).");
      return;
    }

    setSubmitting(true);
    const formData = new FormData(form);
    if (lockedClientId) formData.set("clientId", lockedClientId);
    if (lockedDevisId) formData.set("devisId", lockedDevisId);
    if (lockedProjectRef) formData.set("projectRef", lockedProjectRef);

    const result = await uploadDocument(formData);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    toast.success("Document ajouté");
    setOpen(false);
    router.push(`/dashboard/documents/${result.data.id}`);
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
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Ajouter un document</DialogTitle>
            <DialogDescription>
              Devis, contrat, facture, plans, croquis, designs, rendus, documents de production ou de pose, réception, garantie…
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-5 px-7 py-6">
            {error && <FormMessage>{error}</FormMessage>}

            <div className="flex flex-col gap-2">
              <Label htmlFor="doc-name">Nom du document</Label>
              <Input id="doc-name" name="name" placeholder="Ex : Contrat signé — Villa Benali" required />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Catégorie</Label>
              <Select name="category" defaultValue={DOCUMENT_CATEGORIES[0]}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOCUMENT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {lockedClientId ? (
              <input type="hidden" name="clientId" value={lockedClientId} />
            ) : (
              clients && (
                <div className="flex flex-col gap-2">
                  <Label>Client (optionnel)</Label>
                  <Select name="clientId" defaultValue="none">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun</SelectItem>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )
            )}
            {lockedClientName && (
              <p className="-mt-3 text-xs text-text-muted">Client : {lockedClientName}</p>
            )}

            {lockedDevisId ? (
              <input type="hidden" name="devisId" value={lockedDevisId} />
            ) : (
              devisOptions && (
                <div className="flex flex-col gap-2">
                  <Label>Devis lié (optionnel)</Label>
                  <Select name="devisId" defaultValue="none">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun</SelectItem>
                      {devisOptions.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )
            )}

            {lockedProjectRef ? (
              <input type="hidden" name="projectRef" value={lockedProjectRef} />
            ) : (
              projectOptions && (
                <div className="flex flex-col gap-2">
                  <Label>Projet lié (optionnel)</Label>
                  <Select name="projectRef" defaultValue="none">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun</SelectItem>
                      {projectOptions.map((p) => (
                        <SelectItem key={p.ref} value={p.ref}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="doc-file">Fichier (optionnel, 8 Mo max)</Label>
              <input
                id="doc-file"
                name="file"
                type="file"
                className="focus-ring flex h-11 w-full items-center rounded-md border border-border-default bg-surface-raised px-3.5 text-sm text-text-secondary file:mr-3 file:rounded-sm file:border-0 file:bg-surface-sunken file:px-3 file:py-1.5 file:text-xs file:font-medium"
              />
              <p className="text-xs text-text-muted">Sans fichier, le document est référencé mais sans aperçu ni téléchargement.</p>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">Annuler</Button>
            </DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Envoi…" : (
                <>
                  <Upload className="h-3.5 w-3.5" /> Ajouter
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { UploadDocumentDialog };
