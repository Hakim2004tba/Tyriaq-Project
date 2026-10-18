"use client";

import * as React from "react";
import { LayoutGrid, Blocks, Wind, Flame, Refrigerator, PackagePlus, SquareStack, ImageIcon, X, ImageOff } from "lucide-react";
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
  const [preview, setPreview] = React.useState<string | null>(null);

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

      {config.photos.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
            <ImageIcon className="h-3.5 w-3.5" /> Photo du client ({config.photos.length})
          </p>
          <div className="flex flex-wrap gap-3">
            {config.photos.map((p, i) =>
              p.dataUrl ? (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPreview(p.dataUrl)}
                  className="focus-ring overflow-hidden rounded-md border border-border-subtle"
                  title={p.name}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- base64 data URL, not a static asset */}
                  <img src={p.dataUrl} alt={p.name} className="h-28 w-28 object-cover transition-opacity hover:opacity-80" />
                </button>
              ) : (
                <div
                  key={i}
                  className="flex h-28 w-28 flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-border-subtle bg-surface-sunken p-2 text-center"
                  title={p.name}
                >
                  <ImageOff className="h-5 w-5 text-text-muted" />
                  <span className="truncate text-[10px] text-text-muted">Image non disponible</span>
                </div>
              ),
            )}
          </div>
        </div>
      )}

      {config.additionalInfo && (
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-text-muted">Informations complémentaires</p>
          <p className="text-sm leading-relaxed text-text-secondary">{config.additionalInfo}</p>
        </div>
      )}

      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 p-6"
          onClick={() => setPreview(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- base64 data URL, not a static asset */}
          <img src={preview} alt="Photo du client" className="max-h-full max-w-full rounded-lg object-contain" />
          <button
            type="button"
            onClick={() => setPreview(null)}
            className="focus-ring absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}

export { KitchenConfigSummary };
