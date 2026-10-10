"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { FormMessage } from "@/components/auth/form-message";
import { PORTFOLIO_CATEGORIES } from "@/lib/data/portfolio";
import { createPortfolioProject, updatePortfolioProject } from "@/lib/actions/portfolio";
import type { PortfolioProjectRecord } from "@/lib/data/operations";

function PortfolioFormDialog({
  project,
  candidateProjects,
  trigger,
}: {
  project?: PortfolioProjectRecord;
  candidateProjects: { ref: string; label: string }[];
  trigger?: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const isEdit = Boolean(project);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const payload = {
      title: form.get("title"),
      category: form.get("category"),
      layout: form.get("layout"),
      location: form.get("location"),
      year: form.get("year"),
      surface: form.get("surface"),
      summary: form.get("summary"),
      description: form.get("description"),
      materials: form.get("materials"),
      finishes: form.get("finishes"),
      sourceProjectRef: form.get("sourceProjectRef"),
    };

    const result = isEdit
      ? await updatePortfolioProject(project!.id, payload)
      : await createPortfolioProject(payload);

    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    toast.success(isEdit ? "Réalisation mise à jour" : "Réalisation créée");
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
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="h-4 w-4" /> Nouvelle réalisation
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Modifier la réalisation" : "Nouvelle réalisation"}</DialogTitle>
            <DialogDescription>
              {isEdit ? "Les images se gèrent depuis la fiche détaillée." : "Les images pourront être ajoutées une fois la fiche créée."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-5 px-7 py-6">
            {error && <FormMessage>{error}</FormMessage>}

            <div className="flex flex-col gap-2">
              <Label htmlFor="pf-title">Titre</Label>
              <Input id="pf-title" name="title" defaultValue={project?.title} placeholder="Ex : Villa Belkacem" required />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label>Style / catégorie</Label>
                <Select name="category" defaultValue={project?.category ?? PORTFOLIO_CATEGORIES[0]}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PORTFOLIO_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="pf-layout">Configuration</Label>
                <Input id="pf-layout" name="layout" defaultValue={project?.layout} placeholder="Ex : Cuisine en L" required />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="pf-location">Ville</Label>
                <Input id="pf-location" name="location" defaultValue={project?.location} placeholder="Ex : Alger" required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="pf-year">Année</Label>
                <Input id="pf-year" name="year" type="number" min={2000} max={2100} defaultValue={project?.year ?? new Date().getFullYear()} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="pf-surface">Surface</Label>
                <Input id="pf-surface" name="surface" defaultValue={project?.surface} placeholder="Ex : 22 m²" required />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="pf-summary">Résumé</Label>
              <Input id="pf-summary" name="summary" defaultValue={project?.summary} placeholder="Une phrase pour présenter le projet" required />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="pf-description">Description (un paragraphe par ligne)</Label>
              <Textarea
                id="pf-description"
                name="description"
                defaultValue={project?.description.join("\n")}
                placeholder={"La démarche du projet, racontée en plusieurs paragraphes…"}
                className="min-h-28"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="pf-materials">Matériaux (séparés par une virgule)</Label>
                <Input id="pf-materials" name="materials" defaultValue={project?.materials.join(", ")} placeholder="Bois massif, Marbre" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="pf-finishes">Finitions (séparées par une virgule)</Label>
                <Input id="pf-finishes" name="finishes" defaultValue={project?.finishes.join(", ")} placeholder="Laqué mat, Bois huilé" />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Projet CRM lié (optionnel)</Label>
              <Select name="sourceProjectRef" defaultValue={project?.sourceProjectRef ?? "none"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  {candidateProjects.map((p) => (
                    <SelectItem key={p.ref} value={p.ref}>{p.label}</SelectItem>
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
              {submitting ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer la réalisation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { PortfolioFormDialog };
