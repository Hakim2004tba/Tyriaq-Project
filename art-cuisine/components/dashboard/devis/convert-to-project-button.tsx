"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { convertDevisToProject } from "@/lib/actions/projects";

function ConvertToProjectButton({ devisId }: { devisId: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function handleClick() {
    setPending(true);
    const result = await convertDevisToProject(devisId);
    setPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Projet créé");
    router.push(`/dashboard/projets/${result.data.id}`);
  }

  return (
    <Button type="button" variant="gold" onClick={handleClick} disabled={pending}>
      <FolderKanban className="h-3.5 w-3.5" /> {pending ? "Création…" : "Convertir en projet"}
    </Button>
  );
}

export { ConvertToProjectButton };
