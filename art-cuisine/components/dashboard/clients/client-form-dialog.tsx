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
import { CLIENT_STATUSES, COMMERCIALS } from "@/lib/data/operations";
import { createClient, updateClient } from "@/lib/actions/clients";
import type { ClientRecord } from "@/lib/data/operations";

function ClientFormDialog({
  trigger,
  client,
  lockedCommercial,
}: {
  trigger: ReactNode;
  client?: ClientRecord;
  /** When set (non-admin users), the commercial field is fixed to this name instead of editable. */
  lockedCommercial?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const isEdit = Boolean(client);

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
      address: form.get("address"),
      commercial: form.get("commercial"),
      status: form.get("status"),
    };

    const result = isEdit
      ? await updateClient(client!.id, payload)
      : await createClient(payload);

    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    toast.success(isEdit ? "Client mis à jour" : "Client ajouté");
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
            <DialogTitle>{isEdit ? "Modifier le client" : "Ajouter un client"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Mettez à jour les informations et le suivi commercial de ce client."
                : "Créez une fiche client pour suivre sa relation avec ART Cuisine."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-5 px-7 py-6">
            {error && <FormMessage>{error}</FormMessage>}

            <div className="flex flex-col gap-2">
              <Label htmlFor="client-name">Nom complet</Label>
              <Input id="client-name" name="name" defaultValue={client?.name} required />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="client-phone">Téléphone</Label>
                <Input id="client-phone" name="phone" defaultValue={client?.phone} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="client-email">E-mail</Label>
                <Input id="client-email" name="email" type="email" defaultValue={client?.email} required />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="client-city">Ville</Label>
                <Input id="client-city" name="city" defaultValue={client?.city} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="client-address">Adresse</Label>
                <Input id="client-address" name="address" defaultValue={client?.address} required />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
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
                  <Select name="commercial" defaultValue={client?.commercial ?? COMMERCIALS[0]}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COMMERCIALS.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label>Statut</Label>
                <Select name="status" defaultValue={client?.status ?? "Actif"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CLIENT_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">Annuler</Button>
            </DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer le client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { ClientFormDialog };
