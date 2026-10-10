"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CircleCheck, MessageSquarePlus, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { clientValidateDesign, clientRequestDesignRevision } from "@/lib/actions/client-design";
import { formatShortDate } from "@/lib/format";
import type { DesignVersionRecord } from "@/lib/data/operations";

function RequestRevisionDialog({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const result = await clientRequestDesignRevision(projectId, { note: form.get("note") });

    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("Votre demande a été envoyée");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setError(null); }}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <MessageSquarePlus className="h-3.5 w-3.5" /> Demander une modification
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Demander une modification</DialogTitle>
            <DialogDescription>Décrivez ce que vous souhaitez changer — votre designer reverra le projet et vous enverra une nouvelle version.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 px-7 py-6">
            {error && <FormMessage>{error}</FormMessage>}
            <Label htmlFor="design-client-note">Votre message</Label>
            <Textarea id="design-client-note" name="note" placeholder="Ex : je souhaiterais revoir la hauteur des meubles hauts…" required minLength={5} />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">Annuler</Button>
            </DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Envoi…" : "Envoyer la demande"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ClientDesignPanel({ projectId, latestVersion }: { projectId: string; latestVersion: DesignVersionRecord }) {
  const router = useRouter();
  const [validating, setValidating] = React.useState(false);

  async function handleValidate() {
    setValidating(true);
    const result = await clientValidateDesign(projectId);
    setValidating(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Design validé — merci !");
    router.refresh();
  }

  return (
    <Card className="flex flex-col gap-4 border-accent/30 bg-accent-soft/20 p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-text-primary">Votre design est prêt pour validation</p>
        <Badge variant="info">v{latestVersion.version} · {latestVersion.kind}</Badge>
      </div>
      <div className="overflow-hidden rounded-md border border-border-subtle bg-stone-100">
        {latestVersion.imageDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={latestVersion.imageDataUrl} alt={`Design — version ${latestVersion.version}`} className="max-h-96 w-full object-contain" />
        ) : (
          <div className="flex aspect-video items-center justify-center"><ImageIcon className="h-6 w-6 text-text-muted" /></div>
        )}
      </div>
      <p className="text-xs text-text-muted">Envoyé le {formatShortDate(latestVersion.createdAt)} par {latestVersion.createdBy}</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="gold" onClick={handleValidate} disabled={validating}>
          <CircleCheck className="h-3.5 w-3.5" /> {validating ? "Validation…" : "Valider le design"}
        </Button>
        <RequestRevisionDialog projectId={projectId} />
      </div>
    </Card>
  );
}

export { ClientDesignPanel };
