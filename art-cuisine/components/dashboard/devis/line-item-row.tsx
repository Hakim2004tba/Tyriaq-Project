"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateDevisLineItem, removeDevisLineItem } from "@/lib/actions/devis-pricing";
import { formatCurrencyDA } from "@/lib/format";
import type { DevisLineItem } from "@/lib/data/operations";

function LineItemRow({ devisId, line }: { devisId: string; line: DevisLineItem }) {
  const router = useRouter();
  const [quantity, setQuantity] = React.useState(String(line.quantity));
  const [unitPrice, setUnitPrice] = React.useState(String(line.unitPrice));
  const [pending, setPending] = React.useState(false);

  async function handleBlur() {
    const nextQuantity = Number(quantity);
    const nextPrice = Number(unitPrice);
    if (nextQuantity === line.quantity && nextPrice === line.unitPrice) return;
    if (!Number.isFinite(nextQuantity) || nextQuantity <= 0 || !Number.isFinite(nextPrice) || nextPrice < 0) return;

    setPending(true);
    const result = await updateDevisLineItem(devisId, line.id, { quantity: nextQuantity, unitPrice: nextPrice });
    setPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  async function handleRemove() {
    setPending(true);
    const result = await removeDevisLineItem(devisId, line.id);
    setPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Ligne supprimée");
    router.refresh();
  }

  return (
    <TableRow>
      <TableCell className="font-medium text-text-primary">{line.label}</TableCell>
      <TableCell className="text-text-secondary">{line.category}</TableCell>
      <TableCell>
        <Input
          type="number"
          min={0.01}
          step={0.01}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          onBlur={handleBlur}
          disabled={pending}
          className="h-8 w-20 text-sm"
        />
      </TableCell>
      <TableCell className="text-text-secondary">{line.unit}</TableCell>
      <TableCell>
        <Input
          type="number"
          min={0}
          step={100}
          value={unitPrice}
          onChange={(e) => setUnitPrice(e.target.value)}
          onBlur={handleBlur}
          disabled={pending}
          className="h-8 w-28 text-sm"
        />
      </TableCell>
      <TableCell className="text-right font-medium">{formatCurrencyDA(line.quantity * line.unitPrice)}</TableCell>
      <TableCell>
        <Button type="button" variant="ghost" size="icon" onClick={handleRemove} disabled={pending}>
          <Trash2 className="h-3.5 w-3.5 text-text-muted" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

export { LineItemRow };
