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
import { AssignedVernisseursField } from "@/components/dashboard/vernissage/assigned-vernisseurs-field";
import { updateVernissageJob } from "@/lib/actions/vernissage";
import { PROJECT_PRIORITIES } from "@/lib/data/project-records";
import { CABINET_FINISHES, VERNISSAGE_FINISHES } from "@/lib/data/vernissage";
import type { VernissageJobRecord } from "@/lib/data/operations";

function toDateInputValue(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function EditVernissageJobDialog({ job }: { job: VernissageJobRecord }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [vernisseurs, setVernisseurs] = React.useState<string[]>(job.assignedVernisseurs);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const result = await updateVernissageJob(job.id, {
      priority: form.get("priority"),
      color: form.get("color"),
      finish: form.get("finish"),
      deadline: form.get("deadline"),
      assignedVernisseurs: vernisseurs,
    });

    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("Job mis à jour");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) { setError(null); setVernisseurs(job.assignedVernisseurs); } }}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <Pencil className="h-3.5 w-3.5" /> Modifier
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Modifier le job {job.ref}</DialogTitle>
            <DialogDescription>Priorité, finition et équipe assignée.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-5 px-7 py-6">
            {error && <FormMessage>{error}</FormMessage>}
            <div className="flex flex-col gap-2">
              <Label>Priorité</Label>
              <Select name="priority" defaultValue={job.priority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROJECT_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label>Couleur</Label>
                <Select name="color" defaultValue={job.color}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CABINET_FINISHES.map((f) => (
                      <SelectItem key={f.hex} value={f.hex}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Finition</Label>
                <Select name="finish" defaultValue={job.finish}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VERNISSAGE_FINISHES.map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="vj-edit-deadline">Échéance</Label>
              <Input id="vj-edit-deadline" name="deadline" type="date" defaultValue={toDateInputValue(job.deadline)} required />
            </div>
            <AssignedVernisseursField selected={vernisseurs} onChange={setVernisseurs} />
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

export { EditVernissageJobDialog };
