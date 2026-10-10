"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ProductsFilterBar({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeCat = searchParams.get("categorie") ?? "";
  const activeSort = searchParams.get("tri") ?? "pertinence";
  const q = searchParams.get("q") ?? "";

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-4">
      {q && (
        <p className="text-sm text-muted">
          Résultats pour <span className="font-semibold text-foreground">&laquo;{q}&raquo;</span>
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => updateParam("categorie", "")}
          className={cn(
            "rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors",
            !activeCat
              ? "border-accent-strong bg-accent/10 text-accent-strong"
              : "border-border text-muted hover:border-accent-strong hover:text-accent-strong"
          )}
        >
          Tout
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => updateParam("categorie", cat.slug)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors",
              activeCat === cat.slug
                ? "border-accent-strong bg-accent/10 text-accent-strong"
                : "border-border text-muted hover:border-accent-strong hover:text-accent-strong"
            )}
          >
            {cat.nom}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-muted" />
          <select
            value={activeSort}
            onChange={(e) => updateParam("tri", e.target.value)}
            className="h-9 rounded-lg border border-border bg-surface-2 px-3 text-xs font-medium outline-none focus:border-accent-strong"
          >
            <option value="pertinence">Pertinence</option>
            <option value="prix-asc">Prix croissant</option>
            <option value="prix-desc">Prix décroissant</option>
            <option value="nouveaute">Nouveautés</option>
          </select>
        </div>
      </div>
    </div>
  );
}
