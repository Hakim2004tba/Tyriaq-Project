"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleCatalogueItemActive } from "@/lib/actions/catalogue";

function ToggleActiveButton({ itemId, active }: { itemId: string; active: boolean }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function handleClick() {
    setPending(true);
    const result = await toggleCatalogueItemActive(itemId);
    setPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(active ? "Article désactivé" : "Article réactivé");
    router.refresh();
  }

  return (
    <Button type="button" variant="ghost" size="icon" onClick={handleClick} disabled={pending} title={active ? "Désactiver" : "Réactiver"}>
      <Power className={`h-3.5 w-3.5 ${active ? "text-text-muted" : "text-[var(--status-success-fg)]"}`} />
    </Button>
  );
}

export { ToggleActiveButton };
