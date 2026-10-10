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
import { addProductionPiece, updatePieceStatus, removeProductionPiece } from "@/lib/actions/production";
import { PIECE_STATUSES } from "@/lib/data/production";
import type { ProductionPieceRecord, PieceStatus } from "@/lib/data/operations";

const STATUS_BADGE: Record<PieceStatus, "neutral" | "info" | "success"> = {
  "À faire": "neutral",
  "En cours": "info",
  Terminée: "success",
};

function AddPieceDialog({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const result = await addProductionPiece(orderId, {
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
            <DialogDescription>Nom, matériau et quantité — chaque pièce du bon de débit.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-5 px-7 py-6">
            {error && <FormMessage>{error}</FormMessage>}
            <div className="flex flex-col gap-2">
              <Label htmlFor="piece-name">Nom de la pièce</Label>
              <Input id="piece-name" name="name" placeholder="Ex : Caisson bas 60cm" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="piece-material">Matériau</Label>
              <Input id="piece-material" name="material" placeholder="Ex : Panneau MDF laqué blanc" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="piece-quantity">Quantité</Label>
                <Input id="piece-quantity" name="quantity" type="number" step={1} min={1} defaultValue={1} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="piece-unit">Unité</Label>
                <Input id="piece-unit" name="unit" defaultValue="unité" required />
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

function PieceStatusSelect({ pieceId, orderId, status }: { pieceId: string; orderId: string; status: PieceStatus }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function handleChange(value: string) {
    setPending(true);
    const result = await updatePieceStatus(pieceId, orderId, value);
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

function RemovePieceButton({ pieceId, orderId }: { pieceId: string; orderId: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function handleRemove() {
    setPending(true);
    const result = await removeProductionPiece(pieceId, orderId);
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

function PiecesPanel({ orderId, pieces }: { orderId: string; pieces: ProductionPieceRecord[] }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <AddPieceDialog orderId={orderId} />
      </div>
      {pieces.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-muted">Aucune pièce enregistrée pour cet ordre.</p>
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
              <PieceStatusSelect pieceId={piece.id} orderId={orderId} status={piece.status} />
              <RemovePieceButton pieceId={piece.id} orderId={orderId} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export { PiecesPanel };
