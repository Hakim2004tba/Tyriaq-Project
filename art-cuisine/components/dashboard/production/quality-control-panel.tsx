"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ClipboardCheck, CircleCheck, CircleX } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FormMessage } from "@/components/auth/form-message";
import { recordQualityControl } from "@/lib/actions/production";
import { formatShortDate } from "@/lib/format";
import type { QualityControlRecord, QualityControlResult } from "@/lib/data/operations";

function RecordQualityControlDialog({ orderId, result }: { orderId: string; result: QualityControlResult }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const submitResult = await recordQualityControl(orderId, { result, notes: form.get("notes") });

    setSubmitting(false);
    if (!submitResult.ok) {
      setError(submitResult.error);
      return;
    }
    toast.success(result === "Conforme" ? "Contrôle qualité validé" : "Reprise enregistrée");
    setOpen(false);
    router.refresh();
  }

  const isPass = result === "Conforme";

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setError(null); }}>
      <DialogTrigger asChild>
        <Button type="button" variant={isPass ? "gold" : "outline"}>
          {isPass ? <CircleCheck className="h-3.5 w-3.5" /> : <CircleX className="h-3.5 w-3.5" />}
          {isPass ? "Conforme" : "Non conforme"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isPass ? "Contrôle conforme" : "Contrôle non conforme"}</DialogTitle>
            <DialogDescription>
              {isPass
                ? "L'ordre passera au statut « Prêt pour vernissage »."
                : "L'ordre repartira en reprise à l'étape « Assemblage »."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 px-7 py-6">
            {error && <FormMessage>{error}</FormMessage>}
            <Label htmlFor="qc-notes">Constat</Label>
            <Textarea id="qc-notes" name="notes" placeholder={isPass ? "Dimensions et finitions conformes au plan." : "Ex : écart de 3mm sur la largeur d'un caisson."} required minLength={3} />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">Annuler</Button>
            </DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Enregistrement…" : "Confirmer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function QualityControlPanel({ orderId, canReview, controls }: { orderId: string; canReview: boolean; controls: QualityControlRecord[] }) {
  const reworkCount = controls.filter((c) => c.result === "Non conforme").length;

  return (
    <div className="flex flex-col gap-4">
      {canReview && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border-subtle bg-surface-sunken p-4">
          <div className="flex items-center gap-2.5">
            <ClipboardCheck className="h-4 w-4 text-text-muted" />
            <p className="text-sm text-text-secondary">Enregistrer le résultat du contrôle qualité.</p>
          </div>
          <div className="flex gap-2">
            <RecordQualityControlDialog orderId={orderId} result="Conforme" />
            <RecordQualityControlDialog orderId={orderId} result="Non conforme" />
          </div>
        </div>
      )}

      {reworkCount > 0 && (
        <p className="text-xs text-text-muted">{reworkCount} reprise{reworkCount > 1 ? "s" : ""} enregistrée{reworkCount > 1 ? "s" : ""} sur cet ordre.</p>
      )}

      {controls.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-muted">Aucun contrôle qualité enregistré pour cet ordre.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {controls.map((c) => (
            <Card key={c.id} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <Badge variant={c.result === "Conforme" ? "success" : "danger"}>{c.result}</Badge>
                <span className="text-xs text-text-muted">{formatShortDate(c.checkedAt)} · {c.checkedBy}</span>
              </div>
              <p className="mt-2 text-sm text-text-secondary">{c.notes}</p>
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}

export { QualityControlPanel };
