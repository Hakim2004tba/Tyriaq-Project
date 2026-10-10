import {
  FileText,
  FileSignature,
  Receipt,
  Wallet,
  Ruler,
  PenTool,
  Palette,
  Box,
  Factory,
  Wrench,
  ClipboardCheck,
  ShieldCheck,
  File,
} from "lucide-react";
import type { DocumentCategory } from "@/lib/data/operations";

const DOCUMENT_CATEGORY_ICON: Record<DocumentCategory, typeof FileText> = {
  "Devis PDF": FileText,
  Contrat: FileSignature,
  Facture: Receipt,
  "Reçu de paiement": Wallet,
  Plans: Ruler,
  Croquis: PenTool,
  Designs: Palette,
  "Rendus 3D": Box,
  "Documents de production": Factory,
  "Documents de pose": Wrench,
  "Procès-verbal de réception": ClipboardCheck,
  Garantie: ShieldCheck,
  Autre: File,
};

function DocumentCategoryIcon({ category, className }: { category: DocumentCategory; className?: string }) {
  const Icon = DOCUMENT_CATEGORY_ICON[category];
  return <Icon className={className ?? "h-4 w-4"} />;
}

export { DOCUMENT_CATEGORY_ICON, DocumentCategoryIcon };
