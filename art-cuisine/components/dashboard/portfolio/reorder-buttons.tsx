"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reorderPortfolioProject } from "@/lib/actions/portfolio";

function ReorderButtons({ id, isFirst, isLast }: { id: string; isFirst: boolean; isLast: boolean }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function move(direction: "haut" | "bas") {
    setPending(true);
    const result = await reorderPortfolioProject(id, direction);
    setPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col">
      <Button type="button" variant="ghost" size="icon" className="h-5 w-6" disabled={pending || isFirst} onClick={() => move("haut")} title="Monter">
        <ChevronUp className="h-3.5 w-3.5" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-5 w-6" disabled={pending || isLast} onClick={() => move("bas")} title="Descendre">
        <ChevronDown className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export { ReorderButtons };
