"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Share2, Copy, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { createDocumentShare, revokeDocumentShare } from "@/lib/actions/documents";
import { formatShortDate } from "@/lib/format";
import type { DocumentShareRecord } from "@/lib/data/operations";

const EXPIRY_OPTIONS = [
  { value: "7", label: "7 jours" },
  { value: "30", label: "30 jours" },
  { value: "0", label: "Sans expiration" },
];

function isUsable(share: DocumentShareRecord): boolean {
  if (share.revoked) return false;
  if (share.expiresAt && new Date(share.expiresAt).getTime() < Date.now()) return false;
  return true;
}

function SharePanel({ documentId, hasFile, shares }: { documentId: string; hasFile: boolean; shares: DocumentShareRecord[] }) {
  const router = useRouter();
  const [expiry, setExpiry] = React.useState("30");
  const [creating, setCreating] = React.useState(false);

  async function handleCreate() {
    setCreating(true);
    const days = Number(expiry);
    const result = await createDocumentShare(documentId, { expiresInDays: days > 0 ? days : undefined });
    setCreating(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    const url = `${window.location.origin}/documents/share/${result.data.token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Lien de partage créé et copié", { description: url });
    } catch {
      toast.success("Lien de partage créé", { description: url });
    }
    router.refresh();
  }

  async function handleRevoke(shareId: string) {
    const result = await revokeDocumentShare(shareId);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Lien révoqué");
    router.refresh();
  }

  async function handleCopy(token: string) {
    const url = `${window.location.origin}/documents/share/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Lien copié");
    } catch {
      toast.error("Impossible de copier le lien");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={expiry} onValueChange={setExpiry}>
          <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            {EXPIRY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" onClick={handleCreate} disabled={creating || !hasFile}>
          <Share2 className="h-3.5 w-3.5" /> {creating ? "Création…" : "Créer un lien de partage"}
        </Button>
        {!hasFile && <p className="text-xs text-text-muted">Ajoutez un fichier pour pouvoir le partager.</p>}
      </div>

      {shares.length > 0 && (
        <ul className="flex flex-col gap-1">
          {shares.map((s) => {
            const usable = isUsable(s);
            return (
              <li key={s.id} className="flex items-center gap-3 border-b border-border-subtle py-3 last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-xs text-text-secondary">/documents/share/{s.token}</p>
                  <p className="text-xs text-text-muted">
                    Créé par {s.createdBy} · {formatShortDate(s.createdAt)}
                    {s.expiresAt ? ` · expire le ${formatShortDate(s.expiresAt)}` : " · sans expiration"}
                  </p>
                </div>
                <Badge variant={usable ? "success" : "neutral"}>{usable ? "Actif" : s.revoked ? "Révoqué" : "Expiré"}</Badge>
                <Button type="button" variant="ghost" size="icon" onClick={() => handleCopy(s.token)} title="Copier le lien">
                  <Copy className="h-3.5 w-3.5 text-text-muted" />
                </Button>
                {usable && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => handleRevoke(s.id)} title="Révoquer">
                    <Ban className="h-3.5 w-3.5 text-text-muted" />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export { SharePanel };
