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
import { AssignedTeamField } from "@/components/dashboard/montage/assigned-team-field";
import { createMontageJob } from "@/lib/actions/montage";
import { PROJECT_PRIORITIES } from "@/lib/data/project-records";
import { MONTAGE_VEHICLES, type ProjectOption } from "@/lib/data/montage";

function CreateMontageJobDialog({ projectOptions = [], lockedProjectId }: { projectOptions?: ProjectOption[]; lockedProjectId?: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [team, setTeam] = React.useState<string[]>([]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const result = await createMontageJob({
      projectId: lockedProjectId ?? form.get("projectId"),
      priority: form.get("priority"),
      scheduledDate: form.get("scheduledDate"),
      assignedTeam: team,
      assignedVehicle: form.get("assignedVehicle"),
      instructions: form.get("instructions"),
    });

    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("Installation planifiée");
    setOpen(false);
    setTeam([]);
    router.push(`/dashboard/montage/${result.data.id}`);
  }

  const noEligibleProjects = !lockedProjectId && projectOptions.length === 0;

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setError(null); }}>
      <DialogTrigger asChild>
        <Button type="button">
          <Plus className="h-3.5 w-3.5" /> Planifier une installation
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Planifier une installation</DialogTitle>
            <DialogDescription>Seuls les projets dont le vernissage est terminé (ou plus avancé) peuvent être posés.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-5 px-7 py-6">
            {error && <FormMessage>{error}</FormMessage>}
            {noEligibleProjects ? (
              <p className="text-sm text-text-muted">Aucun projet prêt pour la pose pour le moment.</p>
            ) : (
              <>
                {!lockedProjectId && (
                  <div className="flex flex-col gap-2">
                    <Label>Projet</Label>
                    <Select name="projectId">
                      <SelectTrigger><SelectValue placeholder="Sélectionner un projet" /></SelectTrigger>
                      <SelectContent>
                        {projectOptions.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <Label>Priorité</Label>
                  <Select name="priority" defaultValue="Normale">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PROJECT_PRIORITIES.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="mj-date">Date et heure d&rsquo;intervention</Label>
                  <Input id="mj-date" name="scheduledDate" type="datetime-local" required />
                </div>
                <AssignedTeamField selected={team} onChange={setTeam} />
                <div className="flex flex-col gap-2">
                  <Label>Véhicule</Label>
                  <Select name="assignedVehicle" defaultValue="none">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun</SelectItem>
                      {MONTAGE_VEHICLES.map((v) => (
                        <SelectItem key={v} value={v}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="mj-instructions">Instructions (optionnel)</Label>
                  <Textarea id="mj-instructions" name="instructions" placeholder="Outillage nécessaire, accès particulier, consignes pour le client…" />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">Annuler</Button>
            </DialogClose>
            {!noEligibleProjects && (
              <Button type="submit" disabled={submitting}>
                {submitting ? "Création…" : "Planifier"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { CreateMontageJobDialog };
