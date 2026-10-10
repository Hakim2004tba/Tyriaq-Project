"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { archivePortfolioProject, restorePortfolioProject } from "@/lib/actions/portfolio";

function ArchiveToggleButton({ id, archived }: { id: string; archived: boolean }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function handleClick() {
    setPending(true);
    const result = archived ? await restorePortfolioProject(id) : await archivePortfolioProject(id);
    setPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(archived ? "Réalisation restaurée en brouillon" : "Réalisation archivée");
    router.refresh();
  }

  return (
    <Button type="button" variant="ghost" size="icon" disabled={pending} onClick={handleClick} title={archived ? "Restaurer" : "Archiver"}>
      {archived ? <ArchiveRestore className="h-3.5 w-3.5 text-text-muted" /> : <Archive className="h-3.5 w-3.5 text-text-muted" />}
    </Button>
  );
}

export { ArchiveToggleButton };
