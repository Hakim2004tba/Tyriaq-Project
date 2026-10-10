"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { updateDevisPricingTerms } from "@/lib/actions/devis-pricing";
import type { DevisRecord } from "@/lib/data/operations";

function PricingTermsForm({ devis }: { devis: DevisRecord }) {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const result = await updateDevisPricingTerms(devis.id, {
      discountType: form.get("discountType"),
      discountValue: form.get("discountValue"),
      taxRate: form.get("taxRate"),
      depositPercent: form.get("depositPercent"),
    });

    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Conditions mises à jour");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-4">
      <div className="flex flex-col gap-2">
        <Label>Remise</Label>
        <Select name="discountType" defaultValue={devis.discountType ?? "none"}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Aucune</SelectItem>
            <SelectItem value="Pourcentage">Pourcentage</SelectItem>
            <SelectItem value="Montant fixe">Montant fixe</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="discountValue">Valeur de la remise</Label>
        <Input id="discountValue" name="discountValue" type="number" min={0} step={1} defaultValue={devis.discountValue} className="h-9" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="taxRate">Taxe (TVA %)</Label>
        <Input id="taxRate" name="taxRate" type="number" min={0} max={100} step={1} defaultValue={devis.taxRate} className="h-9" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="depositPercent">Acompte (%)</Label>
        <Input id="depositPercent" name="depositPercent" type="number" min={0} max={100} step={1} defaultValue={devis.depositPercent} className="h-9" />
      </div>
      <div className="sm:col-span-4">
        <Button type="submit" size="sm" variant="outline" disabled={submitting}>
          {submitting ? "Enregistrement…" : "Mettre à jour les conditions"}
        </Button>
      </div>
    </form>
  );
}

export { PricingTermsForm };
