"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Layers } from "lucide-react";
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
import { addVernissagePiece, updateVernissagePieceStatus, removeVernissagePiece } from "@/lib/actions/vernissage";
import { PIECE_STATUSES } from "@/lib/data/vernissage";
import type { VernissagePieceRecord, PieceStatus } from "@/lib/data/operations";

const STATUS_BADGE: Record<PieceStatus, "neutral" | "info" | "success"> = {
  "À faire": "neutral",
  "En cours": "info",
  Terminée: "success",
};

function AddPieceDialog({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const result = await addVernissagePiece(jobId, {
      name: form.get("name"),
      material: form.get("material"),
      quantity: form.get("quantity"),
      unit: form.get("unit"),
    });

    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("Pièce ajoutée");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setError(null); }}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          <Plus className="h-3.5 w-3.5" /> Ajouter une pièce
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Ajouter une pièce</DialogTitle>
            <DialogDescription>Nom, matériau et quantité — chaque pièce à vernir.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-5 px-7 py-6">
            {error && <FormMessage>{error}</FormMessage>}
            <div className="flex flex-col gap-2">
              <Label htmlFor="vpiece-name">Nom de la pièce</Label>
              <Input id="vpiece-name" name="name" placeholder="Ex : Portes de placard" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="vpiece-material">Matériau</Label>
              <Input id="vpiece-material" name="material" placeholder="Ex : Panneau MDF laqué blanc" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="vpiece-quantity">Quantité</Label>
                <Input id="vpiece-quantity" name="quantity" type="number" step={1} min={1} defaultValue={1} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="vpiece-unit">Unité</Label>
                <Input id="vpiece-unit" name="unit" defaultValue="unité" required />
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">Annuler</Button>
            </DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Ajout…" : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PieceStatusSelect({ pieceId, jobId, status }: { pieceId: string; jobId: string; status: PieceStatus }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function handleChange(value: string) {
    setPending(true);
    const result = await updateVernissagePieceStatus(pieceId, jobId, value);
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
        {PIECE_STATUSES.map((s) => (
          <SelectItem key={s} value={s}>{s}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function RemovePieceButton({ pieceId, jobId }: { pieceId: string; jobId: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function handleRemove() {
    setPending(true);
    const result = await removeVernissagePiece(pieceId, jobId);
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleRemove}
      disabled={pending}
      className="focus-ring flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-text-muted hover:text-[var(--status-danger-fg)]"
      aria-label="Retirer la pièce"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}

function PiecesPanel({ jobId, pieces }: { jobId: string; pieces: VernissagePieceRecord[] }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <AddPieceDialog jobId={jobId} />
      </div>
      {pieces.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-muted">Aucune pièce enregistrée pour ce job.</p>
      ) : (
        <ul className="flex flex-col">
          {pieces.map((piece) => (
            <li key={piece.id} className="flex items-center gap-3 border-b border-border-subtle py-3.5 last:border-0">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-accent-strong">
                <Layers className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text-primary">{piece.name}</p>
                <p className="text-xs text-text-muted">{piece.material} · {piece.quantity} {piece.unit}</p>
              </div>
              <Badge variant={STATUS_BADGE[piece.status]}>{piece.status}</Badge>
              <PieceStatusSelect pieceId={piece.id} jobId={jobId} status={piece.status} />
              <RemovePieceButton pieceId={piece.id} jobId={jobId} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export { PiecesPanel };
