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
import { updateProjectStage } from "@/lib/actions/projects";
import { PROJECT_STAGES } from "@/lib/data/project-records";
import type { ProjectStage } from "@/lib/data/operations";

function StageSelect({ projectId, stage, className }: { projectId: string; stage: ProjectStage; className?: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function handleChange(value: string) {
    setPending(true);
    const result = await updateProjectStage(projectId, value);
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
      <SelectTrigger className={className ?? "h-8 w-44 text-xs"}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PROJECT_STAGES.map((s) => (
          <SelectItem key={s} value={s}>{s}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export { StageSelect };
