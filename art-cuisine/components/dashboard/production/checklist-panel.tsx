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
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { FormMessage } from "@/components/auth/form-message";
import { toggleChecklistItem, addChecklistItem } from "@/lib/actions/production";
import { PRODUCTION_STAGES } from "@/lib/data/production";
import type { ProductionChecklistItemRecord, ProductionStage } from "@/lib/data/operations";

function ChecklistRow({ item, orderId }: { item: ProductionChecklistItemRecord; orderId: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function handleToggle() {
    setPending(true);
    const result = await toggleChecklistItem(item.id, orderId);
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <label className="flex items-center gap-2.5 py-2 text-sm text-text-secondary">
      <Checkbox checked={item.done} disabled={pending} onCheckedChange={handleToggle} />
      <span className={item.done ? "text-text-muted line-through" : undefined}>{item.label}</span>
    </label>
  );
}

function AddChecklistItemDialog({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const result = await addChecklistItem(orderId, {
      stage: form.get("stage"),
      label: form.get("label"),
    });

    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("Élément ajouté");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setError(null); }}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          <Plus className="h-3.5 w-3.5" /> Ajouter un élément
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Ajouter un élément de checklist</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-5 px-7 py-6">
            {error && <FormMessage>{error}</FormMessage>}
            <div className="flex flex-col gap-2">
              <Label>Étape</Label>
              <Select name="stage" defaultValue={PRODUCTION_STAGES[0]}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRODUCTION_STAGES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="checklist-label">Libellé</Label>
              <Input id="checklist-label" name="label" placeholder="Ex : Vérifier l'équerrage des caissons" required />
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

function ChecklistPanel({ orderId, items }: { orderId: string; items: ProductionChecklistItemRecord[] }) {
  const groups = PRODUCTION_STAGES.map((stage) => ({
    stage,
    items: items.filter((i) => i.stage === stage),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-end">
        <AddChecklistItemDialog orderId={orderId} />
      </div>
      {groups.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-muted">Aucun élément de checklist pour cet ordre.</p>
      ) : (
        groups.map(({ stage, items: stageItems }: { stage: ProductionStage; items: ProductionChecklistItemRecord[] }) => (
          <div key={stage}>
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">{stage}</p>
            <div className="mt-1 divide-y divide-border-subtle">
              {stageItems.map((item) => (
                <ChecklistRow key={item.id} item={item} orderId={orderId} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export { ChecklistPanel };
