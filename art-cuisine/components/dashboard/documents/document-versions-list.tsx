import { FileQuestion } from "lucide-react";
import { formatShortDate } from "@/lib/format";
import type { DocumentVersionRecord } from "@/lib/data/operations";

function DocumentVersionsList({ versions }: { versions: DocumentVersionRecord[] }) {
  return (
    <ul className="flex flex-col gap-1">
      {versions.map((v) => (
        <li key={v.id} className="flex items-center gap-3 border-b border-border-subtle py-3.5 last:border-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-text-secondary">
            <FileQuestion className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-text-primary">v{v.version} — {v.fileName ?? "Sans fichier"}</p>
            <p className="text-xs text-text-muted">
              {v.sizeLabel} · {v.uploadedBy}{v.note ? ` · ${v.note}` : ""}
            </p>
          </div>
          {v.dataUrl ? (
            <a href={v.dataUrl} download={v.fileName ?? undefined} className="shrink-0 text-xs font-medium text-text-accent hover:opacity-70">
              Télécharger
            </a>
          ) : (
            <span className="shrink-0 text-xs text-text-muted">Sans fichier</span>
          )}
          <span className="shrink-0 text-xs text-text-muted">{formatShortDate(v.uploadedAt)}</span>
        </li>
      ))}
    </ul>
  );
}

export { DocumentVersionsList };
