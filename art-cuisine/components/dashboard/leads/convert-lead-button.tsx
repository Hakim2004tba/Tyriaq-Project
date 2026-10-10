"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserCheck } from "lucide-react";
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
import { convertLeadToClient } from "@/lib/actions/leads";

function ConvertLeadButton({ leadId, leadName }: { leadId: string; leadName: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleConvert() {
    setSubmitting(true);
    const result = await convertLeadToClient(leadId);
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    setOpen(false);
    toast.success(`${leadName} a été converti en client`);
    router.push(`/dashboard/clients/${result.data.clientId}`);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="gold">
          <UserCheck className="h-4 w-4" /> Convertir en client
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convertir ce lead en client</DialogTitle>
          <DialogDescription>
            Une fiche client sera créée pour {leadName} à partir des informations
            de ce lead, et son statut passera à « Gagné ».
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="ghost">Annuler</Button>
          </DialogClose>
          <Button variant="gold" onClick={handleConvert} disabled={submitting}>
            {submitting ? "Conversion…" : "Confirmer la conversion"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { ConvertLeadButton };
