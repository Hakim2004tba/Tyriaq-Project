"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ReactNode } from "react";
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
import { updateProject } from "@/lib/actions/projects";
import { COMMERCIALS, DESIGNERS, PRODUCTION_LEADS, VERNISSEURS, MONTAGE_LEADS, PROJECT_PRIORITIES } from "@/lib/data/project-records";
import type { ProjectRecord } from "@/lib/data/operations";

function toDateInputValue(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function RosterSelect({ name, label, defaultValue, roster }: { name: string; label: string; defaultValue: string | null; roster: readonly string[] }) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <Select name={name} defaultValue={defaultValue ?? "none"}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Non assigné</SelectItem>
          {roster.map((r) => (
            <SelectItem key={r} value={r}>{r}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ProjectFormDialog({ project, trigger, lockedCommercial }: { project: ProjectRecord; trigger: ReactNode; lockedCommercial?: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const result = await updateProject(project.id, {
      name: form.get("name"),
      commercial: lockedCommercial ?? form.get("commercial"),
      designer: form.get("designer"),
      productionLead: form.get("productionLead"),
      vernisseur: form.get("vernisseur"),
      montageLead: form.get("montageLead"),
      priority: form.get("priority"),
      amount: form.get("amount"),
      dueDate: form.get("dueDate"),
      progress: form.get("progress"),
    });

    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    toast.success("Projet mis à jour");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Modifier le projet</DialogTitle>
            <DialogDescription>Équipe, priorité, budget et échéance.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-5 px-7 py-6">
            {error && <FormMessage>{error}</FormMessage>}

            <div className="flex flex-col gap-2">
              <Label htmlFor="project-name">Nom du projet</Label>
              <Input id="project-name" name="name" defaultValue={project.name} required />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {!lockedCommercial && (
                <div className="flex flex-col gap-2">
                  <Label>Commercial</Label>
                  <Select name="commercial" defaultValue={project.commercial ?? COMMERCIALS[0]}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COMMERCIALS.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex flex-col gap-2">
                <Label>Priorité</Label>
                <Select name="priority" defaultValue={project.priority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROJECT_PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <RosterSelect name="designer" label="Designer" defaultValue={project.designer} roster={DESIGNERS} />
              <RosterSelect name="productionLead" label="Responsable production" defaultValue={project.productionLead} roster={PRODUCTION_LEADS} />
              <RosterSelect name="vernisseur" label="Vernisseur" defaultValue={project.vernisseur} roster={VERNISSEURS} />
              <RosterSelect name="montageLead" label="Responsable montage" defaultValue={project.montageLead} roster={MONTAGE_LEADS} />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="project-amount">Budget (DA)</Label>
                <Input id="project-amount" name="amount" type="number" min={0} step={1} defaultValue={project.amount} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="project-due">Échéance</Label>
                <Input id="project-due" name="dueDate" type="date" defaultValue={toDateInputValue(project.dueDate)} required />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="project-progress">Avancement ({project.progress}%)</Label>
              <Input id="project-progress" name="progress" type="range" min={0} max={100} step={5} defaultValue={project.progress} />
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

export { ProjectFormDialog };
