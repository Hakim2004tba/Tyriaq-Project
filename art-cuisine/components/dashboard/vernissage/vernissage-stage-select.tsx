"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { updateVernissageStage } from "@/lib/actions/vernissage";
import { VERNISSAGE_STAGES } from "@/lib/data/vernissage";
import type { VernissageStage } from "@/lib/data/operations";

function VernissageStageSelect({ jobId, stage, className }: { jobId: string; stage: VernissageStage; className?: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function handleChange(value: string) {
    setPending(true);
    const result = await updateVernissageStage(jobId, value);
    setPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Étape mise à jour");
    router.refresh();
  }

  return (
    <Select value={stage} onValueChange={handleChange} disabled={pending}>
      <SelectTrigger className={className ?? "h-8 w-48 text-xs"}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {VERNISSAGE_STAGES.map((s) => (
          <SelectItem key={s} value={s}>{s}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export { VernissageStageSelect };
