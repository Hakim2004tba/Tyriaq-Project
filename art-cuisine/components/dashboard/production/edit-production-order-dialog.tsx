"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { FormMessage } from "@/components/auth/form-message";
import { AssignedWorkersField } from "@/components/dashboard/production/assigned-workers-field";
import { updateProductionOrder } from "@/lib/actions/production";
import { PROJECT_PRIORITIES } from "@/lib/data/project-records";
import type { ProductionOrderRecord } from "@/lib/data/operations";

function toDateInputValue(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function EditProductionOrderDialog({ order }: { order: ProductionOrderRecord }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [workers, setWorkers] = React.useState<string[]>(order.assignedWorkers);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const result = await updateProductionOrder(order.id, {
      priority: form.get("priority"),
      deadline: form.get("deadline"),
      assignedWorkers: workers,
    });

    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("Ordre mis à jour");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) { setError(null); setWorkers(order.assignedWorkers); } }}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <Pencil className="h-3.5 w-3.5" /> Modifier
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Modifier l&rsquo;ordre {order.ref}</DialogTitle>
            <DialogDescription>Priorité, échéance et équipe assignée.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-5 px-7 py-6">
            {error && <FormMessage>{error}</FormMessage>}
            <div className="flex flex-col gap-2">
              <Label>Priorité</Label>
              <Select name="priority" defaultValue={order.priority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROJECT_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="po-edit-deadline">Échéance</Label>
              <Input id="po-edit-deadline" name="deadline" type="date" defaultValue={toDateInputValue(order.deadline)} required />
            </div>
            <AssignedWorkersField selected={workers} onChange={setWorkers} />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">Annuler</Button>
            </DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { EditProductionOrderDialog };
