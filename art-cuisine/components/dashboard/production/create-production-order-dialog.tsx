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
import { AssignedWorkersField } from "@/components/dashboard/production/assigned-workers-field";
import { createProductionOrder } from "@/lib/actions/production";
import { PROJECT_PRIORITIES } from "@/lib/data/project-records";
import type { ProjectOption } from "@/lib/data/production";

function CreateProductionOrderDialog({ projectOptions = [], lockedProjectId }: { projectOptions?: ProjectOption[]; lockedProjectId?: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [workers, setWorkers] = React.useState<string[]>([]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const result = await createProductionOrder({
      projectId: lockedProjectId ?? form.get("projectId"),
      priority: form.get("priority"),
      deadline: form.get("deadline"),
      assignedWorkers: workers,
      workshopNotes: form.get("workshopNotes"),
    });

    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("Ordre de fabrication créé");
    setOpen(false);
    setWorkers([]);
    router.push(`/dashboard/production/${result.data.id}`);
  }

  const noEligibleProjects = !lockedProjectId && projectOptions.length === 0;

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setError(null); }}>
      <DialogTrigger asChild>
        <Button type="button">
          <Plus className="h-3.5 w-3.5" /> Nouvel ordre de fabrication
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nouvel ordre de fabrication</DialogTitle>
            <DialogDescription>Seuls les projets dont le design est validé par le client peuvent être lancés en production.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-5 px-7 py-6">
            {error && <FormMessage>{error}</FormMessage>}
            {noEligibleProjects ? (
              <p className="text-sm text-text-muted">Aucun projet avec un design validé n&rsquo;est disponible pour le moment.</p>
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
                  <Label htmlFor="po-deadline">Échéance</Label>
                  <Input id="po-deadline" name="deadline" type="date" required />
                </div>
                <AssignedWorkersField selected={workers} onChange={setWorkers} />
                <div className="flex flex-col gap-2">
                  <Label htmlFor="po-notes">Notes d&rsquo;atelier (optionnel)</Label>
                  <Textarea id="po-notes" name="workshopNotes" placeholder="Consignes particulières pour l'équipe…" />
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
                {submitting ? "Création…" : "Créer l'ordre"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { CreateProductionOrderDialog };
