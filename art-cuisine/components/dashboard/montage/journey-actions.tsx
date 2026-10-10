"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Truck, MapPin, Hammer, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateMontageStage } from "@/lib/actions/montage";
import type { MontageStage } from "@/lib/data/operations";

const NEXT_STEP: Partial<Record<MontageStage, { stage: MontageStage; label: string; icon: typeof Truck }>> = {
  Planifié: { stage: "En route", label: "Démarrer le trajet", icon: Truck },
  "En route": { stage: "Arrivé", label: "Arrivé sur place", icon: MapPin },
  Arrivé: { stage: "Installation", label: "Démarrer l'installation", icon: Hammer },
  Installation: { stage: "Ajustements finaux", label: "Terminer l'installation", icon: CheckCircle2 },
};

function JourneyActions({ jobId, stage }: { jobId: string; stage: MontageStage }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  const next = NEXT_STEP[stage];
  if (!next) return null;

  async function handleClick() {
    setPending(true);
    const result = await updateMontageStage(jobId, next!.stage);
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(next!.label);
    router.refresh();
  }

  const Icon = next.icon;

  return (
    <Button type="button" size="lg" onClick={handleClick} disabled={pending} className="w-full">
      <Icon className="h-4 w-4" /> {pending ? "…" : next.label}
    </Button>
  );
}

export { JourneyActions };
