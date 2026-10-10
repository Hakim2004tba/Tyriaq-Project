"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { FormMessage } from "@/components/auth/form-message";
import { CATALOGUE_CATEGORIES, CATALOGUE_UNITS, CATALOGUE_AVAILABILITY_STATUSES } from "@/lib/data/operations";
import { createCatalogueItem, updateCatalogueItem } from "@/lib/actions/catalogue";
import type { CatalogueItemRecord } from "@/lib/data/operations";

function CatalogueItemDialog({ trigger, item }: { trigger: ReactNode; item?: CatalogueItemRecord }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [taxable, setTaxable] = React.useState(item?.taxable ?? true);
  const [active, setActive] = React.useState(item?.active ?? true);

  const isEdit = Boolean(item);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const payload = {
      name: form.get("name"),
      sku: form.get("sku"),
      category: form.get("category"),
      unit: form.get("unit"),
      unitPrice: form.get("unitPrice"),
      availability: form.get("availability"),
      description: form.get("description"),
      taxable,
      active,
    };

    const result = isEdit ? await updateCatalogueItem(item!.id, payload) : await createCatalogueItem(payload);

    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    toast.success(isEdit ? "Article mis à jour" : "Article créé");
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
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Modifier l'article" : "Nouvel article"}</DialogTitle>
            <DialogDescription>
              {isEdit ? "Un changement de prix est enregistré dans l'historique." : "Ajoutez un article au catalogue tarifaire."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-5 px-7 py-6">
            {error && <FormMessage>{error}</FormMessage>}

            <div className="grid gap-5 sm:grid-cols-[1fr_auto]">
              <div className="flex flex-col gap-2">
                <Label htmlFor="cat-name">Nom</Label>
                <Input id="cat-name" name="name" defaultValue={item?.name} placeholder="Ex : Caisson bas 60cm" required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="cat-sku">SKU / référence</Label>
                <Input id="cat-sku" name="sku" defaultValue={item?.sku} placeholder="Ex : CAI-001" className="sm:w-36" required />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label>Catégorie</Label>
                <Select name="category" defaultValue={item?.category ?? CATALOGUE_CATEGORIES[0]}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATALOGUE_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Unité</Label>
                <Select name="unit" defaultValue={item?.unit ?? CATALOGUE_UNITS[0]}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATALOGUE_UNITS.map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="cat-price">Prix unitaire (DA)</Label>
                <Input id="cat-price" name="unitPrice" type="number" min={0} step={100} defaultValue={item?.unitPrice} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Disponibilité</Label>
                <Select name="availability" defaultValue={item?.availability ?? CATALOGUE_AVAILABILITY_STATUSES[0]}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATALOGUE_AVAILABILITY_STATUSES.map((a) => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="cat-description">Description</Label>
              <Textarea id="cat-description" name="description" defaultValue={item?.description} placeholder="Détails, dimensions, spécifications…" />
            </div>

            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm text-text-secondary">
                <Checkbox checked={taxable} onCheckedChange={(v) => setTaxable(v === true)} />
                Soumis à la TVA
              </label>
              <label className="flex items-center gap-2 text-sm text-text-secondary">
                <Checkbox checked={active} onCheckedChange={(v) => setActive(v === true)} />
                Actif (visible pour les nouveaux devis)
              </label>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">Annuler</Button>
            </DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer l'article"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { CatalogueItemDialog };
