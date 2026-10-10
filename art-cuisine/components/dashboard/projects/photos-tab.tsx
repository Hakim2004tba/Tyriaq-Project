import Link from "next/link";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UploadDocumentDialog } from "@/components/dashboard/documents/upload-document-dialog";
import type { DocumentRecord } from "@/lib/data/operations";

function PhotosTab({
  projectRef,
  clientId,
  clientName,
  photos,
}: {
  projectRef: string;
  clientId?: string;
  clientName?: string;
  photos: DocumentRecord[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <UploadDocumentDialog
          lockedClientId={clientId}
          lockedClientName={clientName}
          lockedProjectRef={projectRef}
          trigger={
            <Button type="button" size="sm" variant="outline">
              <Camera className="h-3.5 w-3.5" /> Ajouter une photo
            </Button>
          }
        />
      </div>
      {photos.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-muted">Aucune photo pour ce projet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((doc) => (
            <Link
              key={doc.id}
              href={`/dashboard/documents/${doc.id}`}
              className="group flex flex-col gap-1.5 overflow-hidden rounded-md border border-border-subtle bg-surface-sunken"
            >
              <div className="flex aspect-square items-center justify-center overflow-hidden bg-stone-100">
                {doc.dataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={doc.dataUrl} alt={doc.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                ) : (
                  <Camera className="h-6 w-6 text-text-muted" />
                )}
              </div>
              <p className="truncate px-2 pb-2 text-xs font-medium text-text-secondary">{doc.name}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export { PhotosTab };
