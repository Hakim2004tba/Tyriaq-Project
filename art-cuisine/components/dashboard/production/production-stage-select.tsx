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
import { updateProductionStage } from "@/lib/actions/production";
import { PRODUCTION_STAGES } from "@/lib/data/production";
import type { ProductionStage } from "@/lib/data/operations";

function ProductionStageSelect({ orderId, stage, className }: { orderId: string; stage: ProductionStage; className?: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function handleChange(value: string) {
    setPending(true);
    const result = await updateProductionStage(orderId, value);
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
        {PRODUCTION_STAGES.map((s) => (
          <SelectItem key={s} value={s}>{s}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export { ProductionStageSelect };
