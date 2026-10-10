"use client";

import * as React from "react";
import { History } from "lucide-react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrencyDA, formatShortDate } from "@/lib/format";
import type { PriceHistoryRecord } from "@/lib/data/operations";

function PriceHistoryDialog({ itemName, history }: { itemName: string; history: PriceHistoryRecord[] }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="icon" disabled={history.length === 0} title="Historique des prix">
          <History className="h-3.5 w-3.5 text-text-muted" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Historique des prix</DialogTitle>
          <DialogDescription>{itemName}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1 px-7 pb-7">
          {history.length === 0 && <p className="py-6 text-center text-sm text-text-muted">Aucun changement de prix enregistré.</p>}
          {history.map((h) => (
            <div key={h.id} className="flex items-center justify-between gap-3 border-b border-border-subtle py-3 last:border-0">
              <div className="min-w-0">
                <p className="text-sm text-text-primary">
                  {formatCurrencyDA(h.previousPrice)} <span className="text-text-muted">→</span> {formatCurrencyDA(h.newPrice)}
                </p>
                <p className="text-xs text-text-muted">{h.changedBy}{h.note ? ` · ${h.note}` : ""}</p>
              </div>
              <span className="shrink-0 text-xs text-text-muted">{formatShortDate(h.changedAt)}</span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { PriceHistoryDialog };
