"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CircleCheck, CircleX, MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { FormMessage } from "@/components/auth/form-message";
import { clientApproveDevis, clientRejectDevis, clientRequestModification } from "@/lib/actions/client-devis";

function NoteDialog({
  devisId,
  action,
  trigger,
  title,
  description,
  placeholder,
  confirmLabel,
}: {
  devisId: string;
  action: (id: string, input: unknown) => Promise<{ ok: true; data: undefined } | { ok: false; error: string }>;
  trigger: React.ReactNode;
  title: string;
  description: string;
  placeholder: string;
  confirmLabel: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const result = await action(devisId, { note: form.get("note") });

    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    toast.success("Votre réponse a été envoyée");
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
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 px-7 py-6">
            {error && <FormMessage>{error}</FormMessage>}
            <Label htmlFor="client-note">Votre message</Label>
            <Textarea id="client-note" name="note" placeholder={placeholder} required minLength={5} />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">Annuler</Button>
            </DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Envoi…" : confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ClientDevisActions({ devisId }: { devisId: string }) {
  const router = useRouter();
  const [approving, setApproving] = React.useState(false);

  async function handleApprove() {
    setApproving(true);
    const result = await clientApproveDevis(devisId);
    setApproving(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Devis approuvé — merci !");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="gold" onClick={handleApprove} disabled={approving}>
        <CircleCheck className="h-3.5 w-3.5" /> Approuver
      </Button>
      <NoteDialog
        devisId={devisId}
        action={clientRequestModification}
        title="Demander une modification"
        description="Décrivez ce que vous souhaitez changer — votre commercial reverra le devis et vous enverra une nouvelle version."
        placeholder="Ex : je souhaiterais revoir la couleur des façades et réduire le budget…"
        confirmLabel="Envoyer la demande"
        trigger={
          <Button type="button" variant="outline">
            <MessageSquarePlus className="h-3.5 w-3.5" /> Demander une modification
          </Button>
        }
      />
      <NoteDialog
        devisId={devisId}
        action={clientRejectDevis}
        title="Refuser ce devis"
        description="Merci de préciser la raison de votre refus."
        placeholder="Ex : budget trop élevé, projet reporté…"
        confirmLabel="Confirmer le refus"
        trigger={
          <Button type="button" variant="outline">
            <CircleX className="h-3.5 w-3.5" /> Refuser
          </Button>
        }
      />
    </div>
  );
}

export { ClientDevisActions };
