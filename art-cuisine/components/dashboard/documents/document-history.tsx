import { Upload, History, Share2, Ban, Eye, Download } from "lucide-react";
import { formatRelativeTime } from "@/lib/format";
import type { DocumentEventRecord, DocumentEventAction } from "@/lib/data/operations";

const ACTION_ICON: Record<DocumentEventAction, typeof Upload> = {
  upload: Upload,
  new_version: History,
  share: Share2,
  revoke_share: Ban,
  view: Eye,
  download: Download,
};

const ACTION_LABEL: Record<DocumentEventAction, string> = {
  upload: "Document ajouté",
  new_version: "Nouvelle version",
  share: "Lien de partage créé",
  revoke_share: "Lien de partage révoqué",
  view: "Consulté",
  download: "Téléchargé",
};

function DocumentHistory({ events }: { events: DocumentEventRecord[] }) {
  if (events.length === 0) {
    return <p className="py-8 text-center text-sm text-text-muted">Aucun historique pour ce document.</p>;
  }

  return (
    <ol className="flex flex-col">
      {events.map((e) => {
        const Icon = ACTION_ICON[e.action];
        return (
          <li key={e.id} className="flex items-start gap-3 border-b border-border-subtle py-3.5 last:border-0">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-text-secondary">
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-text-primary">
                {ACTION_LABEL[e.action]} <span className="text-text-muted">— {e.actor}</span>
              </p>
              {e.detail && <p className="text-xs text-text-muted">{e.detail}</p>}
            </div>
            <span className="shrink-0 text-xs text-stone-400">{formatRelativeTime(e.timestamp)}</span>
          </li>
        );
      })}
    </ol>
  );
}

export { DocumentHistory };
