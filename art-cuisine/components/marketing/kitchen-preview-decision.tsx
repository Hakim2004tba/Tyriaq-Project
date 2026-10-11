"use client";

import * as React from "react";
import { toast } from "sonner";
import { ThumbsUp, ThumbsDown, MessageSquarePlus, Loader2, CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { submitCustomerRenderDecision } from "@/lib/actions/kitchen-render-customer";
import type { CustomerDecision } from "@/lib/data/kitchen-render";

const DECISION_LABEL: Record<CustomerDecision, string> = {
  approved: "Vous avez approuvé ce design.",
  rejected: "Vous avez refusé ce design.",
  changes_requested: "Vous avez demandé une modification.",
};

function KitchenPreviewDecision({ token, existingDecision }: { token: string; existingDecision: CustomerDecision | null }) {
  const [mode, setMode] = React.useState<"idle" | "note">("idle");
  const [pendingDecision, setPendingDecision] = React.useState<"rejected" | "changes_requested" | null>(null);
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState<CustomerDecision | null>(existingDecision);

  async function submit(decision: CustomerDecision, noteValue?: string) {
    setBusy(true);
    const result = await submitCustomerRenderDecision(token, { decision, note: noteValue });
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setDone(decision);
    setMode("idle");
    setNote("");
    toast.success("Votre réponse a été transmise à notre équipe");
  }

  function startNote(decision: "rejected" | "changes_requested") {
    setPendingDecision(decision);
    setMode("note");
  }

  if (mode === "note" && pendingDecision) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-ink-950">
          {pendingDecision === "rejected" ? "Pourquoi ce design ne vous convient pas ?" : "Que souhaitez-vous modifier ?"}
        </p>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Décrivez ce que vous aimeriez changer…" />
        <div className="flex gap-2">
          <Button type="button" onClick={() => submit(pendingDecision, note)} disabled={busy || note.trim().length < 3}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Envoyer
          </Button>
          <Button type="button" variant="outline" onClick={() => setMode("idle")} disabled={busy}>
            Annuler
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {done && (
        <div className="flex items-center gap-2 rounded-md bg-stone-50 px-4 py-3 text-sm text-stone-600">
          <CircleCheck className="h-4 w-4 shrink-0 text-[var(--status-success-fg)]" /> {DECISION_LABEL[done]} Vous pouvez changer votre réponse ci-dessous si besoin.
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => submit("approved")} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsUp className="h-4 w-4" />} Approuver ce design
        </Button>
        <Button type="button" variant="outline" onClick={() => startNote("changes_requested")} disabled={busy}>
          <MessageSquarePlus className="h-4 w-4" /> Demander une modification
        </Button>
        <Button type="button" variant="ghost" onClick={() => startNote("rejected")} disabled={busy}>
          <ThumbsDown className="h-4 w-4" /> Refuser
        </Button>
      </div>
    </div>
  );
}

export { KitchenPreviewDecision };
