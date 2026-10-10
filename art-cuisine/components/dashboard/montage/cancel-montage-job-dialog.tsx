"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Ban } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { FormMessage } from "@/components/auth/form-message";
import { cancelMontageJob } from "@/lib/actions/montage";

function CancelMontageJobDialog({ jobId, jobRef }: { jobId: string; jobRef: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const result = await cancelMontageJob(jobId, { reason: form.get("reason") });

    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("Installation annulée");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setError(null); }}>
      <DialogTrigger asChild>
        <Button type="button" variant="destructive">
          <Ban className="h-3.5 w-3.5" /> Annuler l&rsquo;installation
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Annuler {jobRef}</DialogTitle>
            <DialogDescription>Cette installation sera marquée comme annulée et ne pourra plus être modifiée.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 px-7 py-6">
            {error && <FormMessage>{error}</FormMessage>}
            <Label htmlFor="cancel-reason">Motif de l&rsquo;annulation</Label>
            <Textarea id="cancel-reason" name="reason" placeholder="Ex : le client a reporté son emménagement…" required minLength={3} />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">Retour</Button>
            </DialogClose>
            <Button type="submit" variant="destructive" disabled={submitting}>
              {submitting ? "Annulation…" : "Confirmer l'annulation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { CancelMontageJobDialog };
