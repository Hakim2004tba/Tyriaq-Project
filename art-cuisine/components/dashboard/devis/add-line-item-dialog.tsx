"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
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
import { addDevisLineItem } from "@/lib/actions/devis-pricing";
import { formatCurrencyDA } from "@/lib/format";
import type { CatalogueCategory, CatalogueItemRecord } from "@/lib/data/operations";

function AddLineItemDialog({
  devisId,
  catalogueByCategory,
}: {
  devisId: string;
  catalogueByCategory: Record<CatalogueCategory, CatalogueItemRecord[]>;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const categories = Object.keys(catalogueByCategory).filter(
    (c) => catalogueByCategory[c as CatalogueCategory].length > 0,
  ) as CatalogueCategory[];

  const [category, setCategory] = React.useState<CatalogueCategory | undefined>(categories[0]);
  const itemsInCategory = category ? catalogueByCategory[category] : [];
  const [itemId, setItemId] = React.useState<string | undefined>(itemsInCategory[0]?.id);
  const selectedItem = itemsInCategory.find((i) => i.id === itemId);

  function handleCategoryChange(next: CatalogueCategory) {
    setCategory(next);
    setItemId(catalogueByCategory[next][0]?.id);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const result = await addDevisLineItem(devisId, {
      catalogueItemId: itemId,
      quantity: form.get("quantity"),
      unitPrice: form.get("unitPrice"),
    });

    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    toast.success("Ligne ajoutée");
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
        <Button type="button" size="sm" variant="outline">
          <Plus className="h-3.5 w-3.5" /> Ajouter une ligne
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Ajouter une ligne au devis</DialogTitle>
            <DialogDescription>Choisissez un article du catalogue, la quantité et le prix appliqué.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-5 px-7 py-6">
            {error && <FormMessage>{error}</FormMessage>}

            {categories.length === 0 ? (
              <p className="text-sm text-text-muted">Aucun article actif dans le catalogue.</p>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  <Label>Catégorie</Label>
                  <Select value={category} onValueChange={(v) => handleCategoryChange(v as CatalogueCategory)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Article</Label>
                  <Select value={itemId} onValueChange={setItemId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {itemsInCategory.map((i) => (
                        <SelectItem key={i.id} value={i.id}>{i.name} — {formatCurrencyDA(i.unitPrice)} / {i.unit}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="line-quantity">Quantité{selectedItem ? ` (${selectedItem.unit})` : ""}</Label>
                    <Input id="line-quantity" name="quantity" type="number" min={0.01} step={0.01} defaultValue={1} required />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="line-price">Prix unitaire (DA)</Label>
                    <Input
                      id="line-price"
                      name="unitPrice"
                      type="number"
                      min={0}
                      step={100}
                      key={selectedItem?.id}
                      defaultValue={selectedItem?.unitPrice ?? 0}
                      required
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">Annuler</Button>
            </DialogClose>
            <Button type="submit" disabled={submitting || categories.length === 0}>
              {submitting ? "Ajout…" : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { AddLineItemDialog };
