"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { FormMessage } from "@/components/auth/form-message";
import { recordPayment } from "@/lib/actions/finance";
import { PAYMENT_METHODS } from "@/lib/data/operations";
import type { PaymentTargetOption } from "@/lib/data/finance";

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

function RecordPaymentDialog({ targetOptions = [], lockedTarget, lockedTargetLabel }: { targetOptions?: PaymentTargetOption[]; lockedTarget?: string; lockedTargetLabel?: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const result = await recordPayment({
      target: lockedTarget ?? form.get("target"),
      amount: form.get("amount"),
      method: form.get("method"),
      status: form.get("status"),
      label: form.get("label"),
      date: form.get("date"),
      notes: form.get("notes"),
    });

    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("Paiement enregistré");
    setOpen(false);
    router.refresh();
  }

  const noEligibleTargets = !lockedTarget && targetOptions.length === 0;

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setError(null); }}>
      <DialogTrigger asChild>
        <Button type="button">
          <Plus className="h-3.5 w-3.5" /> Enregistrer un paiement
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Enregistrer un paiement</DialogTitle>
            <DialogDescription>
              {lockedTargetLabel ? `Pour ${lockedTargetLabel}.` : "Choisissez le projet (ou le devis, si le projet n'existe pas encore)."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-5 px-7 py-6">
            {error && <FormMessage>{error}</FormMessage>}
            {noEligibleTargets ? (
              <p className="text-sm text-text-muted">Aucun projet ou devis accepté disponible pour le moment.</p>
            ) : (
              <>
                {!lockedTarget && (
                  <div className="flex flex-col gap-2">
                    <Label>Projet / devis</Label>
                    <Select name="target">
                      <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                      <SelectContent>
                        {targetOptions.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="pay-label">Libellé</Label>
                  <Input id="pay-label" name="label" placeholder="Ex : Acompte 30%, 2ᵉ versement, Solde final…" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="pay-amount">Montant (DA)</Label>
                    <Input id="pay-amount" name="amount" type="number" step={1} min={1} required />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="pay-date">Date</Label>
                    <Input id="pay-date" name="date" type="date" defaultValue={todayInputValue()} required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label>Méthode</Label>
                    <Select name="method" defaultValue={PAYMENT_METHODS[1]}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Statut</Label>
                    <Select name="status" defaultValue="Payé">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Payé">Payé</SelectItem>
                        <SelectItem value="En attente">En attente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="pay-notes">Notes (optionnel)</Label>
                  <Textarea id="pay-notes" name="notes" placeholder="Référence de virement, détails complémentaires…" />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">Annuler</Button>
            </DialogClose>
            {!noEligibleTargets && (
              <Button type="submit" disabled={submitting}>
                {submitting ? "Enregistrement…" : "Enregistrer"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { RecordPaymentDialog };
