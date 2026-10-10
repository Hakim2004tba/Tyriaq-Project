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
import { AssignedVernisseursField } from "@/components/dashboard/vernissage/assigned-vernisseurs-field";
import { createVernissageJob } from "@/lib/actions/vernissage";
import { PROJECT_PRIORITIES } from "@/lib/data/project-records";
import { CABINET_FINISHES, VERNISSAGE_FINISHES } from "@/lib/data/vernissage";
import type { ProjectOption } from "@/lib/data/vernissage";

function CreateVernissageJobDialog({ projectOptions = [], lockedProjectId }: { projectOptions?: ProjectOption[]; lockedProjectId?: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [vernisseurs, setVernisseurs] = React.useState<string[]>([]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const result = await createVernissageJob({
      projectId: lockedProjectId ?? form.get("projectId"),
      priority: form.get("priority"),
      color: form.get("color"),
      finish: form.get("finish"),
      deadline: form.get("deadline"),
      assignedVernisseurs: vernisseurs,
      notes: form.get("notes"),
    });

    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("Job de vernissage créé");
    setOpen(false);
    setVernisseurs([]);
    router.push(`/dashboard/vernissage/${result.data.id}`);
  }

  const noEligibleProjects = !lockedProjectId && projectOptions.length === 0;

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setError(null); }}>
      <DialogTrigger asChild>
        <Button type="button">
          <Plus className="h-3.5 w-3.5" /> Nouveau job de vernissage
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nouveau job de vernissage</DialogTitle>
            <DialogDescription>Seuls les projets dont la production est terminée (ou plus avancée) peuvent être vernis.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-5 px-7 py-6">
            {error && <FormMessage>{error}</FormMessage>}
            {noEligibleProjects ? (
              <p className="text-sm text-text-muted">Aucun projet prêt pour le vernissage pour le moment.</p>
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
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label>Couleur</Label>
                    <Select name="color" defaultValue={CABINET_FINISHES[0].hex}>
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
                    <Select name="finish" defaultValue={VERNISSAGE_FINISHES[0]}>
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
                  <Label htmlFor="vj-deadline">Échéance</Label>
                  <Input id="vj-deadline" name="deadline" type="date" required />
                </div>
                <AssignedVernisseursField selected={vernisseurs} onChange={setVernisseurs} />
                <div className="flex flex-col gap-2">
                  <Label htmlFor="vj-notes">Notes (optionnel)</Label>
                  <Textarea id="vj-notes" name="notes" placeholder="Consignes particulières pour l'équipe…" />
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
                {submitting ? "Création…" : "Créer le job"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { CreateVernissageJobDialog };
