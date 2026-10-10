import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { AddLineItemDialog } from "@/components/dashboard/devis/add-line-item-dialog";
import { LineItemRow } from "@/components/dashboard/devis/line-item-row";
import { PricingTermsForm } from "@/components/dashboard/devis/pricing-terms-form";
import { formatCurrencyDA } from "@/lib/format";
import type { DevisRecord, DevisLineItem, CatalogueCategory, CatalogueItemRecord } from "@/lib/data/operations";
import type { DevisTotals } from "@/lib/data/pricing";

function TotalRow({ label, value, emphasis = false, negative = false }: { label: string; value: number; emphasis?: boolean; negative?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${emphasis ? "text-base font-semibold text-text-primary" : "text-sm text-text-secondary"}`}>
      <span>{label}</span>
      <span className={emphasis ? "text-text-primary" : undefined}>
        {negative && value > 0 ? "− " : ""}{formatCurrencyDA(value)}
      </span>
    </div>
  );
}

function PricingSection({
  devis,
  lines,
  totals,
  catalogueByCategory,
}: {
  devis: DevisRecord;
  lines: DevisLineItem[];
  totals: DevisTotals;
  catalogueByCategory: Record<CatalogueCategory, CatalogueItemRecord[]>;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-muted">
          {lines.length === 0
            ? "Aucune ligne — le montant du devis reste celui saisi manuellement."
            : "Le montant du devis est calculé automatiquement à partir de ces lignes."}
        </p>
        <AddLineItemDialog devisId={devis.id} catalogueByCategory={catalogueByCategory} />
      </div>

      {lines.length > 0 && (
        <Table className="border-none">
          <TableHeader>
            <TableRow>
              <TableHead>Désignation</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Quantité</TableHead>
              <TableHead>Unité</TableHead>
              <TableHead>Prix unitaire</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line) => (
              <LineItemRow key={line.id} devisId={devis.id} line={line} />
            ))}
          </TableBody>
        </Table>
      )}

      <Separator />

      <PricingTermsForm devis={devis} />

      <Separator />

      <div className="ml-auto flex w-full max-w-xs flex-col gap-2 sm:w-72">
        <TotalRow label="Sous-total" value={totals.subtotal} />
        {totals.discountAmount > 0 && <TotalRow label={`Remise${devis.discountType === "Pourcentage" ? ` (${devis.discountValue}%)` : ""}`} value={totals.discountAmount} negative />}
        <TotalRow label={`TVA (${devis.taxRate}%)`} value={totals.taxAmount} />
        <Separator />
        <TotalRow label="Total" value={totals.total} emphasis />
        <TotalRow label={`Acompte à la commande (${devis.depositPercent}%)`} value={totals.depositAmount} />
        <TotalRow label="Solde restant" value={totals.remainingBalance} />
      </div>
    </div>
  );
}

export { PricingSection };
