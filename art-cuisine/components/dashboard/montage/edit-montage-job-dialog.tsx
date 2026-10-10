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
import { AssignedTeamField } from "@/components/dashboard/montage/assigned-team-field";
import { updateMontageJob } from "@/lib/actions/montage";
import { PROJECT_PRIORITIES } from "@/lib/data/project-records";
import { MONTAGE_VEHICLES } from "@/lib/data/montage";
import type { MontageJobRecord } from "@/lib/data/operations";

function toDateTimeInputValue(iso: string): string {
  return new Date(iso).toISOString().slice(0, 16);
}

function EditMontageJobDialog({ job }: { job: MontageJobRecord }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [team, setTeam] = React.useState<string[]>(job.assignedTeam);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const result = await updateMontageJob(job.id, {
      priority: form.get("priority"),
      scheduledDate: form.get("scheduledDate"),
      assignedTeam: team,
      assignedVehicle: form.get("assignedVehicle"),
    });

    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("Installation mise à jour");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) { setError(null); setTeam(job.assignedTeam); } }}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <Pencil className="h-3.5 w-3.5" /> Modifier
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Modifier l&rsquo;installation {job.ref}</DialogTitle>
            <DialogDescription>Priorité, date d&rsquo;intervention, équipe et véhicule assignés — changer la date reprogramme l&rsquo;installation.</DialogDescription>
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
            <div className="flex flex-col gap-2">
              <Label htmlFor="mj-edit-date">Date et heure d&rsquo;intervention</Label>
              <Input id="mj-edit-date" name="scheduledDate" type="datetime-local" defaultValue={toDateTimeInputValue(job.scheduledDate)} required />
            </div>
            <AssignedTeamField selected={team} onChange={setTeam} />
            <div className="flex flex-col gap-2">
              <Label>Véhicule</Label>
              <Select name="assignedVehicle" defaultValue={job.assignedVehicle ?? "none"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  {MONTAGE_VEHICLES.map((v) => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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

export { EditMontageJobDialog };
