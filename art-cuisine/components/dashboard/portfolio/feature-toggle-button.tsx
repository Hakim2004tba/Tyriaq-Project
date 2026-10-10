"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toggleFeaturedPortfolioProject } from "@/lib/actions/portfolio";

function FeatureToggleButton({ id, featured }: { id: string; featured: boolean }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function handleClick() {
    setPending(true);
    const result = await toggleFeaturedPortfolioProject(id);
    setPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(featured ? "Retiré des réalisations à la une" : "Mis en avant à la une");
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={pending}
      onClick={handleClick}
      title={featured ? "Retirer de la une" : "Mettre à la une"}
    >
      <Star className={cn("h-3.5 w-3.5", featured ? "fill-gold-400 text-gold-400" : "text-text-muted")} />
    </Button>
  );
}

export { FeatureToggleButton };
