"use client";

import * as React from "react";
import { Download, ExternalLink, FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { recordDocumentEvent } from "@/lib/actions/documents";

function DocumentPreview({
  documentId,
  dataUrl,
  mimeType,
  fileName,
}: {
  documentId: string;
  dataUrl: string | null;
  mimeType: string | null;
  fileName: string | null;
}) {
  const viewLogged = React.useRef(false);

  React.useEffect(() => {
    if (dataUrl && !viewLogged.current) {
      viewLogged.current = true;
      recordDocumentEvent(documentId, "view").catch(() => {});
    }
  }, [documentId, dataUrl]);

  function handleDownload() {
    recordDocumentEvent(documentId, "download").catch(() => {});
  }

  function handlePrint() {
    recordDocumentEvent(documentId, "view").catch(() => {});
  }

  if (!dataUrl) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border-strong bg-surface-sunken py-16 text-center">
        <FileQuestion className="h-8 w-8 text-text-muted" />
        <p className="text-sm text-text-muted">
          Aucun fichier disponible pour ce document — il a été référencé sans aperçu.
        </p>
      </div>
    );
  }

  const isImage = mimeType?.startsWith("image/");
  const isPdf = mimeType === "application/pdf";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" asChild onClick={handleDownload}>
          <a href={dataUrl} download={fileName ?? undefined}>
            <Download className="h-3.5 w-3.5" /> Télécharger
          </a>
        </Button>
        <Button type="button" variant="outline" asChild onClick={handlePrint}>
          <a href={dataUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3.5 w-3.5" /> Ouvrir et imprimer
          </a>
        </Button>
      </div>

      {isImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={dataUrl} alt={fileName ?? "Aperçu du document"} className="max-h-[70vh] w-full rounded-md border border-border-subtle object-contain" />
      )}
      {isPdf && (
        <iframe src={dataUrl} title={fileName ?? "Aperçu du document"} className="h-[70vh] w-full rounded-md border border-border-subtle" />
      )}
      {!isImage && !isPdf && (
        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border-strong bg-surface-sunken py-16 text-center">
          <FileQuestion className="h-8 w-8 text-text-muted" />
          <p className="text-sm text-text-muted">Aperçu non disponible pour ce type de fichier — téléchargez-le pour l&rsquo;ouvrir.</p>
        </div>
      )}
    </div>
  );
}

export { DocumentPreview };
