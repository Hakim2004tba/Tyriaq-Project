import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UploadDocumentDialog } from "@/components/dashboard/documents/upload-document-dialog";
import { DocumentsList } from "@/components/dashboard/clients/client-profile-tabs";
import { getDevisOptions } from "@/lib/data/devis";
import { getProjectOptions } from "@/lib/data/appointments";
import type { DocumentRecord } from "@/lib/data/operations";

async function ClientDocumentsPanel({
  clientId,
  clientName,
  documents,
}: {
  clientId: string;
  clientName: string;
  documents: DocumentRecord[];
}) {
  const devisOptions = await getDevisOptions(null, clientId);
  const projectOptions = getProjectOptions();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <UploadDocumentDialog
          lockedClientId={clientId}
          lockedClientName={clientName}
          devisOptions={devisOptions}
          projectOptions={projectOptions}
          trigger={
            <Button size="sm" variant="outline">
              <Upload className="h-3.5 w-3.5" /> Ajouter un document
            </Button>
          }
        />
      </div>
      <DocumentsList documents={documents} />
    </div>
  );
}

export { ClientDocumentsPanel };
