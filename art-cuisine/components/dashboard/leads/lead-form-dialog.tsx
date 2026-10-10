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
import { LEAD_SOURCES, PROJECT_TYPES, COMMERCIALS } from "@/lib/data/operations";
import { createLead, updateLead } from "@/lib/actions/leads";
import type { LeadRecord } from "@/lib/data/operations";

function LeadFormDialog({
  trigger,
  lead,
  lockedCommercial,
}: {
  trigger: ReactNode;
  lead?: LeadRecord;
  /** When set (non-admin users), the commercial field is fixed to this name instead of editable. */
  lockedCommercial?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const isEdit = Boolean(lead);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const payload = {
      name: form.get("name"),
      phone: form.get("phone"),
      email: form.get("email"),
      city: form.get("city"),
      source: form.get("source"),
      projectType: form.get("projectType"),
      budget: form.get("budget"),
      commercial: form.get("commercial"),
    };

    const result = isEdit ? await updateLead(lead!.id, payload) : await createLead(payload);

    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    toast.success(isEdit ? "Lead mis à jour" : "Lead créé");
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
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Modifier le lead" : "Nouveau lead"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Mettez à jour les informations de ce prospect."
                : "Enregistrez un nouveau prospect dans le pipeline commercial."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-5 px-7 py-6">
            {error && <FormMessage>{error}</FormMessage>}

            <div className="flex flex-col gap-2">
              <Label htmlFor="lead-name">Nom complet</Label>
              <Input id="lead-name" name="name" defaultValue={lead?.name} required />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="lead-phone">Téléphone</Label>
                <Input id="lead-phone" name="phone" defaultValue={lead?.phone} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="lead-email">E-mail</Label>
                <Input id="lead-email" name="email" type="email" defaultValue={lead?.email} required />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="lead-city">Ville</Label>
                <Input id="lead-city" name="city" defaultValue={lead?.city} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Source</Label>
                <Select name="source" defaultValue={lead?.source ?? LEAD_SOURCES[0]}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEAD_SOURCES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label>Type de projet</Label>
                <Select name="projectType" defaultValue={lead?.projectType ?? PROJECT_TYPES[0]}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROJECT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="lead-budget">Budget estimé (DA)</Label>
                <Input id="lead-budget" name="budget" type="number" min={0} step={10000} defaultValue={lead?.budget} required />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Commercial responsable</Label>
              {lockedCommercial ? (
                <>
                  <div className="flex h-11 items-center rounded-md border border-border-default bg-surface-sunken px-3.5 text-sm text-text-secondary">
                    {lockedCommercial}
                  </div>
                  <input type="hidden" name="commercial" value={lockedCommercial} />
                </>
              ) : (
                <Select name="commercial" defaultValue={lead?.commercial ?? COMMERCIALS[0]}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COMMERCIALS.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">Annuler</Button>
            </DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer le lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { LeadFormDialog };
