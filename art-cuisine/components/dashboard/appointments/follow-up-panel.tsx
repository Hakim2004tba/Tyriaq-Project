"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addFollowUpNotes } from "@/lib/actions/appointments";

function FollowUpPanel({ appointmentId, followUpNotes }: { appointmentId: string; followUpNotes: string | null }) {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const [value, setValue] = React.useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!value.trim()) return;

    setSubmitting(true);
    const result = await addFollowUpNotes(appointmentId, { followUpNotes: value });
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success("Compte-rendu enregistré");
    router.refresh();
  }

  if (followUpNotes) {
    return (
      <div className="flex items-start gap-3 rounded-md border border-[var(--status-success-fg)]/25 bg-[var(--status-success-bg)] px-4 py-3.5">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--status-success-fg)]" />
        <p className="text-sm leading-relaxed text-[var(--status-success-fg)]">{followUpNotes}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <p className="text-sm text-text-muted">
        Ajoutez un compte-rendu pour clôturer ce rendez-vous — le statut passera automatiquement à « Terminé ».
      </p>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Résumé de l'échange, décisions prises, prochaine étape…"
        required
      />
      <Button type="submit" size="sm" className="w-fit" disabled={submitting}>
        {submitting ? "Enregistrement…" : "Enregistrer le compte-rendu"}
      </Button>
    </form>
  );
}

export { FollowUpPanel };
