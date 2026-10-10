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
import { setPortfolioProjectStatus } from "@/lib/actions/portfolio";
import { PORTFOLIO_STATUSES } from "@/lib/data/portfolio";
import type { PortfolioStatus } from "@/lib/data/operations";

function PortfolioStatusSelect({ id, status, className }: { id: string; status: PortfolioStatus; className?: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function handleChange(value: string) {
    setPending(true);
    const result = await setPortfolioProjectStatus(id, value);
    setPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Statut mis à jour");
    router.refresh();
  }

  return (
    <Select value={status} onValueChange={handleChange} disabled={pending}>
      <SelectTrigger className={className ?? "h-8 w-36 text-xs"}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PORTFOLIO_STATUSES.map((s) => (
          <SelectItem key={s} value={s}>{s}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export { PortfolioStatusSelect };
