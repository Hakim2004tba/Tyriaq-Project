import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { FileQuestion, Download } from "lucide-react";
import { getShareByToken, isShareUsable, getDocumentById } from "@/lib/data/documents";
import { formatShortDate } from "@/lib/format";
import { DocumentCategoryIcon } from "@/components/dashboard/documents/document-icon";

export async function generateMetadata({ params }: PageProps<"/documents/share/[token]">): Promise<Metadata> {
  const { token } = await params;
  const share = getShareByToken(token);
  const doc = share ? getDocumentById(share.documentId) : undefined;
  return { title: doc ? `${doc.name} — ART Cuisine` : "Document partagé — ART Cuisine" };
}

export default async function SharedDocumentPage({ params }: PageProps<"/documents/share/[token]">) {
  const { token } = await params;
  const share = getShareByToken(token);
  if (!share || !isShareUsable(share)) notFound();

  const doc = getDocumentById(share.documentId);
  if (!doc) notFound();

  const isImage = doc.mimeType?.startsWith("image/");
  const isPdf = doc.mimeType === "application/pdf";

  return (
    <div className="min-h-screen bg-surface-sunken py-10">
      <div className="mx-auto max-w-3xl rounded-lg border border-border-subtle bg-white p-10 shadow-elevation-sm">
        <div className="flex items-center justify-between border-b border-border-subtle pb-6">
          <div>
            <p className="font-display text-xl font-medium text-ink-950">ART CUISINE</p>
            <p className="mt-1 text-xs uppercase tracking-widest text-stone-500">Document partagé</p>
          </div>
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-stone-100 text-ink-950">
            <DocumentCategoryIcon category={doc.category} className="h-5 w-5" />
          </span>
        </div>

        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">{doc.category}</p>
          <h1 className="mt-1 font-display text-lg font-medium text-ink-950">{doc.name}</h1>
          <p className="mt-1 text-xs text-stone-500">
            Version {doc.version} · mis à jour le {formatShortDate(doc.updatedAt)}
          </p>
        </div>

        <div className="mt-6">
          {!doc.dataUrl && (
            <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-stone-300 bg-stone-50 py-16 text-center">
              <FileQuestion className="h-8 w-8 text-stone-400" />
              <p className="text-sm text-stone-500">Aucun fichier disponible pour ce document.</p>
            </div>
          )}
          {doc.dataUrl && isImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={doc.dataUrl} alt={doc.fileName ?? doc.name} className="max-h-[70vh] w-full rounded-md border border-stone-200 object-contain" />
          )}
          {doc.dataUrl && isPdf && (
            <iframe src={doc.dataUrl} title={doc.fileName ?? doc.name} className="h-[70vh] w-full rounded-md border border-stone-200" />
          )}
          {doc.dataUrl && !isImage && !isPdf && (
            <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-stone-300 bg-stone-50 py-16 text-center">
              <FileQuestion className="h-8 w-8 text-stone-400" />
              <p className="text-sm text-stone-500">Aperçu non disponible pour ce type de fichier — téléchargez-le pour l&rsquo;ouvrir.</p>
            </div>
          )}
        </div>

        {doc.dataUrl && (
          <div className="mt-6 flex justify-center">
            <a
              href={doc.dataUrl}
              download={doc.fileName ?? undefined}
              className="focus-ring inline-flex items-center gap-2 rounded-md bg-ink-950 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-ink-900"
            >
              <Download className="h-4 w-4" /> Télécharger
            </a>
          </div>
        )}

        <div className="mt-10 border-t border-stone-200 pt-6 text-center text-xs text-stone-500">
          ART Cuisine — contact@art-cuisine.dz — +213 5 55 00 00 00
        </div>
      </div>
    </div>
  );
}
