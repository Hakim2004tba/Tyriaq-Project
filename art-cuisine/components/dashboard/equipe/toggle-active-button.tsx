"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setEmployeeActive } from "@/lib/actions/equipe";

function ToggleActiveButton({ userId, active, isSelf }: { userId: string; active: boolean; isSelf: boolean }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  if (isSelf) return null;

  async function handleClick() {
    setPending(true);
    const result = await setEmployeeActive(userId, !active);
    setPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(active ? "Compte désactivé" : "Compte réactivé");
    router.refresh();
  }

  return (
    <Button type="button" variant={active ? "destructive" : "outline"} onClick={handleClick} disabled={pending}>
      <Power className="h-3.5 w-3.5" /> {pending ? "…" : active ? "Désactiver" : "Réactiver"}
    </Button>
  );
}

export { ToggleActiveButton };
