import { LayoutGrid, Blocks, Wind, Flame, Refrigerator, PackagePlus, SquareStack, ImageIcon, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { KitchenConfigRecord } from "@/lib/data/operations";

function SpecRow({ icon: Icon, label, value }: { icon: typeof LayoutGrid; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-border-subtle py-3 last:border-0">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-accent-strong">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-text-muted">{label}</p>
        <p className="text-sm font-medium text-text-primary">{value}</p>
      </div>
    </div>
  );
}

function KitchenConfigSummary({ config }: { config: KitchenConfigRecord }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <SpecRow icon={LayoutGrid} label="Agencement" value={`Cuisine ${config.layout}`} />
        <SpecRow icon={Blocks} label="Îlot" value={config.island} />
        <SpecRow icon={SquareStack} label="Profondeur" value={config.depth} />
        <SpecRow icon={Wind} label="Hotte" value={config.hood} />
        <SpecRow icon={Flame} label="Four" value={config.oven} />
        <SpecRow icon={Refrigerator} label="Réfrigérateur" value={config.fridge} />
      </div>

      <div>
        <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
          <PackagePlus className="h-3.5 w-3.5" /> Accessoires
        </p>
        {config.accessories.length === 0 ? (
          <p className="text-sm text-text-muted">Aucun accessoire sélectionné.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {config.accessories.map((a) => (
              <Badge key={a} variant="gold">{a}</Badge>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <p className="text-xs text-text-muted">Budget</p>
          <p className="text-sm font-medium text-text-primary">{config.budget}</p>
        </div>
        <div>
          <p className="text-xs text-text-muted">Sol</p>
          <p className="text-sm font-medium text-text-primary">{config.floor}</p>
        </div>
        <div>
          <p className="text-xs text-text-muted">Dimensions</p>
          <p className="text-sm font-medium text-text-primary">{config.dimensions}</p>
        </div>
      </div>

      {(config.photos.length > 0 || config.sketches.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {config.photos.length > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
                <ImageIcon className="h-3.5 w-3.5" /> Photos ({config.photos.length})
              </p>
              <ul className="flex flex-col gap-1.5">
                {config.photos.map((p, i) => (
                  <li key={i} className="truncate rounded-md border border-border-subtle bg-surface-sunken px-3 py-2 text-xs text-text-secondary">
                    {p.name} <span className="text-text-muted">· {p.sizeLabel}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {config.sketches.length > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
                <FileText className="h-3.5 w-3.5" /> Croquis ({config.sketches.length})
              </p>
              <ul className="flex flex-col gap-1.5">
                {config.sketches.map((s, i) => (
                  <li key={i} className="truncate rounded-md border border-border-subtle bg-surface-sunken px-3 py-2 text-xs text-text-secondary">
                    {s.name} <span className="text-text-muted">· {s.sizeLabel}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {config.additionalInfo && (
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-text-muted">Informations complémentaires</p>
          <p className="text-sm leading-relaxed text-text-secondary">{config.additionalInfo}</p>
        </div>
      )}
    </div>
  );
}

export { KitchenConfigSummary };
