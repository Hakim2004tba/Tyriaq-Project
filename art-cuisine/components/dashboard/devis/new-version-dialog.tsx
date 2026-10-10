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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormMessage } from "@/components/auth/form-message";
import { createDevisVersion } from "@/lib/actions/devis";
import type { DevisRecord } from "@/lib/data/operations";

function toDateInputValue(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function NewVersionDialog({ devis }: { devis: DevisRecord }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const result = await createDevisVersion(devis.id, {
      amount: form.get("amount"),
      projectLabel: form.get("projectLabel"),
      validUntil: form.get("validUntil"),
      note: form.get("note"),
    });

    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    toast.success(`Version ${devis.version + 1} créée et envoyée`);
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
            <DialogTitle>Nouvelle version du devis {devis.ref}</DialogTitle>
            <DialogDescription>
              La version {devis.version} actuelle est conservée dans l&rsquo;historique. Cette révision repart avec le statut « Envoyé ».
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-5 px-7 py-6">
            {error && <FormMessage>{error}</FormMessage>}

            <div className="flex flex-col gap-2">
              <Label htmlFor="version-project">Description du projet</Label>
              <Input id="version-project" name="projectLabel" defaultValue={devis.projectLabel} required />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="version-amount">Nouveau montant (DA)</Label>
                <Input id="version-amount" name="amount" type="number" min={0} step={1} defaultValue={devis.amount} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="version-valid">Valide jusqu&rsquo;au</Label>
                <Input id="version-valid" name="validUntil" type="date" defaultValue={toDateInputValue(devis.validUntil)} required />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="version-note">Ce qui a changé</Label>
              <Textarea
                id="version-note"
                name="note"
                placeholder="Ex : hauteur des meubles hauts revue, plan de travail remplacé par une gamme plus économique…"
                required
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">Annuler</Button>
            </DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Création…" : "Créer et envoyer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { NewVersionDialog };
