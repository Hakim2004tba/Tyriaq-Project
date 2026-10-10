"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { duplicateDevis } from "@/lib/actions/devis";

function DuplicateDevisButton({ devisId }: { devisId: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function handleClick() {
    setPending(true);
    const result = await duplicateDevis(devisId);
    setPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Devis dupliqué");
    router.push(`/dashboard/devis/${result.data.id}`);
  }

  return (
    <Button type="button" variant="outline" onClick={handleClick} disabled={pending}>
      <Copy className="h-3.5 w-3.5" /> Dupliquer
    </Button>
  );
}

export { DuplicateDevisButton };
