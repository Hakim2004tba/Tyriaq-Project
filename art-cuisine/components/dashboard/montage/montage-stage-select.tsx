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
import { updateMontageStage } from "@/lib/actions/montage";
import { MONTAGE_STAGES } from "@/lib/data/montage";
import type { MontageStage } from "@/lib/data/operations";

function MontageStageSelect({ jobId, stage, className }: { jobId: string; stage: MontageStage; className?: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function handleChange(value: string) {
    setPending(true);
    const result = await updateMontageStage(jobId, value);
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
        {MONTAGE_STAGES.map((s) => (
          <SelectItem key={s} value={s}>{s}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export { MontageStageSelect };
