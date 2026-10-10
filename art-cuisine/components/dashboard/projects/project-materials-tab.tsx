"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Layers } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormMessage } from "@/components/auth/form-message";
import { updateProjectMaterials } from "@/lib/actions/projects";
import { formatCurrencyDA } from "@/lib/format";
import type { CatalogueCategory, CatalogueItemRecord } from "@/lib/data/operations";

function ProjectMaterialsTab({
  projectId,
  catalogueByCategory,
  selectedIds,
}: {
  projectId: string;
  catalogueByCategory: Record<CatalogueCategory, CatalogueItemRecord[]>;
  selectedIds: string[];
}) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<Set<string>>(new Set(selectedIds));
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const categories = (Object.keys(catalogueByCategory) as CatalogueCategory[]).filter(
    (c) => catalogueByCategory[c].length > 0,
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSave() {
    setError(null);
    setSubmitting(true);

    const result = await updateProjectMaterials(projectId, { itemIds: Array.from(selected) });

    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("Matériaux mis à jour");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <FormMessage>{error}</FormMessage>}

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Layers className="h-4 w-4 text-text-muted" />
            <h3 className="text-sm font-semibold text-text-primary">Matériaux & finitions sélectionnés</h3>
          </div>
          <Button type="button" size="sm" disabled={submitting} onClick={handleSave}>
            {submitting ? "Enregistrement…" : "Enregistrer la sélection"}
          </Button>
        </div>

        {selected.size === 0 ? (
          <p className="text-sm text-text-muted">Aucun matériau sélectionné pour ce projet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {categories
              .flatMap((c) => catalogueByCategory[c])
              .filter((i) => selected.has(i.id))
              .map((i) => (
                <Badge key={i.id} variant="gold">{i.name}</Badge>
              ))}
          </div>
        )}
      </Card>

      {categories.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-muted">Aucun article actif dans le catalogue.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {categories.map((category) => (
            <Card key={category} className="p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">{category}</p>
              <ul className="flex flex-col gap-2.5">
                {catalogueByCategory[category].map((item) => (
                  <li key={item.id}>
                    <label className="flex cursor-pointer items-start gap-2.5 text-sm">
                      <Checkbox checked={selected.has(item.id)} onCheckedChange={() => toggle(item.id)} />
                      <span className="flex-1">
                        <span className="block text-text-primary">{item.name}</span>
                        <span className="block text-xs text-text-muted">
                          {item.sku} · {formatCurrencyDA(item.unitPrice)} / {item.unit}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export { ProjectMaterialsTab };
