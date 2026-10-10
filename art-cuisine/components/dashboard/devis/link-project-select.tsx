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
import { linkDevisToProject } from "@/lib/actions/devis";

const NONE = "__none__";

function LinkProjectSelect({
  devisId,
  projectRef,
  projectOptions,
}: {
  devisId: string;
  projectRef: string | null;
  projectOptions: { ref: string; label: string }[];
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function handleChange(value: string) {
    setPending(true);
    const result = await linkDevisToProject(devisId, { projectRef: value === NONE ? null : value });
    setPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(value === NONE ? "Projet dissocié" : "Devis lié au projet");
    router.refresh();
  }

  return (
    <Select value={projectRef ?? NONE} onValueChange={handleChange} disabled={pending}>
      <SelectTrigger className="h-9 w-full sm:w-64"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>Aucun projet lié</SelectItem>
        {projectOptions.map((p) => (
          <SelectItem key={p.ref} value={p.ref}>{p.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export { LinkProjectSelect };
