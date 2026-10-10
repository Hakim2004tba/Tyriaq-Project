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
import { COMMERCIALS } from "@/lib/data/operations";
import { createDevis, updateDevis } from "@/lib/actions/devis";
import type { DevisRecord } from "@/lib/data/operations";
import type { PersonOption, ProjectOption } from "@/components/dashboard/appointments/appointment-form-dialog";

function toDateInputValue(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function DevisFormDialog({
  trigger,
  devis,
  clients,
  leads,
  projects,
  lockedCommercial,
}: {
  trigger: ReactNode;
  devis?: DevisRecord;
  clients: PersonOption[];
  leads: PersonOption[];
  projects: ProjectOption[];
  lockedCommercial?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const isEdit = Boolean(devis);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const payload = {
      clientId: form.get("clientId"),
      leadId: form.get("leadId"),
      projectRef: form.get("projectRef"),
      projectLabel: form.get("projectLabel"),
      amount: form.get("amount"),
      validUntil: form.get("validUntil"),
      commercial: form.get("commercial"),
    };

    const result = isEdit ? await updateDevis(devis!.id, payload) : await createDevis(payload);

    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    toast.success(isEdit ? "Devis mis à jour" : "Devis créé");
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
            <DialogTitle>{isEdit ? "Modifier le devis" : "Nouveau devis"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Mettez à jour les informations de ce devis."
                : "Créez un devis pour un client existant, relié à un lead et un projet si besoin."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-5 px-7 py-6">
            {error && <FormMessage>{error}</FormMessage>}

            <div className="flex flex-col gap-2">
              <Label>Client</Label>
              {clients.length > 0 ? (
                <Select name="clientId" defaultValue={devis?.clientId ?? clients[0]?.id}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-xs text-text-muted">Aucun client disponible — créez d&rsquo;abord un client.</p>
              )}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label>Lead lié (optionnel)</Label>
                <Select name="leadId" defaultValue={devis?.leadId ?? "none"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {leads.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Projet lié (optionnel)</Label>
                <Select name="projectRef" defaultValue={devis?.projectRef ?? "none"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.ref} value={p.ref}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="devis-project">Description du projet</Label>
              <Input
                id="devis-project"
                name="projectLabel"
                defaultValue={devis?.projectLabel}
                placeholder="Ex : Cuisine en L — Résidence"
                required
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="devis-amount">Montant (DA)</Label>
                <Input id="devis-amount" name="amount" type="number" min={0} step={1} defaultValue={devis?.amount} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="devis-valid">Valide jusqu&rsquo;au</Label>
                <Input
                  id="devis-valid"
                  name="validUntil"
                  type="date"
                  defaultValue={devis ? toDateInputValue(devis.validUntil) : undefined}
                  required
                />
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
                <Select name="commercial" defaultValue={devis?.commercial ?? COMMERCIALS[0]}>
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
            <Button type="submit" disabled={submitting || (!isEdit && clients.length === 0)}>
              {submitting ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer le devis"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { DevisFormDialog };
