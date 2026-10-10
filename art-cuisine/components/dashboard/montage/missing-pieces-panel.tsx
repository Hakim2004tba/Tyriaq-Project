"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, PackageX } from "lucide-react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { FormMessage } from "@/components/auth/form-message";
import { addMissingPiece, updateMissingPieceStatus } from "@/lib/actions/montage";
import { MISSING_PIECE_STATUSES } from "@/lib/data/montage";
import { formatShortDate } from "@/lib/format";
import type { MontageMissingPieceRecord, MissingPieceStatus } from "@/lib/data/operations";

const STATUS_BADGE: Record<MissingPieceStatus, "danger" | "warning" | "success"> = {
  Signalée: "danger",
  Commandée: "warning",
  Reçue: "success",
};

function AddMissingPieceDialog({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const result = await addMissingPiece(jobId, {
      name: form.get("name"),
      quantity: form.get("quantity"),
    });

    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("Pièce manquante signalée");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setError(null); }}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          <Plus className="h-3.5 w-3.5" /> Signaler une pièce manquante
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Signaler une pièce manquante</DialogTitle>
            <DialogDescription>Une pièce absente du chantier ou endommagée à la livraison.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-5 px-7 py-6">
            {error && <FormMessage>{error}</FormMessage>}
            <div className="flex flex-col gap-2">
              <Label htmlFor="mp-name">Pièce</Label>
              <Input id="mp-name" name="name" placeholder="Ex : Poignée profil intégré — 40cm" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="mp-quantity">Quantité</Label>
              <Input id="mp-quantity" name="quantity" type="number" step={1} min={1} defaultValue={1} required />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">Annuler</Button>
            </DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Envoi…" : "Signaler"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MissingPieceStatusSelect({ pieceId, jobId, status }: { pieceId: string; jobId: string; status: MissingPieceStatus }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function handleChange(value: string) {
    setPending(true);
    const result = await updateMissingPieceStatus(pieceId, jobId, value);
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <Select value={status} onValueChange={handleChange} disabled={pending}>
      <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
      <SelectContent>
        {MISSING_PIECE_STATUSES.map((s) => (
          <SelectItem key={s} value={s}>{s}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function MissingPiecesPanel({ jobId, pieces }: { jobId: string; pieces: MontageMissingPieceRecord[] }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <AddMissingPieceDialog jobId={jobId} />
      </div>
      {pieces.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-muted">Aucune pièce manquante signalée pour cette installation.</p>
      ) : (
        <ul className="flex flex-col">
          {pieces.map((piece) => (
            <li key={piece.id} className="flex items-center gap-3 border-b border-border-subtle py-3.5 last:border-0">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--status-danger-bg)] text-[var(--status-danger-fg)]">
                <PackageX className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text-primary">{piece.name}</p>
                <p className="text-xs text-text-muted">Qté {piece.quantity} · signalée le {formatShortDate(piece.reportedAt)}</p>
              </div>
              <Badge variant={STATUS_BADGE[piece.status]}>{piece.status}</Badge>
              <MissingPieceStatusSelect pieceId={piece.id} jobId={jobId} status={piece.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export { MissingPiecesPanel };
