"use client";

import { Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

function PrintActions() {
  return (
    <div className="print:hidden mx-auto mb-6 flex max-w-3xl items-center justify-between gap-3 px-6">
      <p className="text-xs text-text-muted">
        Utilisez &laquo;&nbsp;Imprimer&nbsp;&raquo; puis choisissez &laquo;&nbsp;Enregistrer au format PDF&nbsp;&raquo; comme destination pour télécharger ce devis.
      </p>
      <div className="flex shrink-0 gap-2">
        <Button type="button" variant="outline" onClick={() => window.print()}>
          <Download className="h-3.5 w-3.5" /> Télécharger (PDF)
        </Button>
        <Button type="button" onClick={() => window.print()}>
          <Printer className="h-3.5 w-3.5" /> Imprimer
        </Button>
      </div>
    </div>
  );
}

export { PrintActions };
