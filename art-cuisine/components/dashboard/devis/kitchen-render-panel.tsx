"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles, ShieldCheck, RotateCcw, History, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  KITCHEN_LAYOUTS,
  ISLAND_OPTIONS,
  DEPTH_OPTIONS,
  HOOD_OPTIONS,
  OVEN_OPTIONS,
  FRIDGE_OPTIONS,
  ACCESSORY_OPTIONS,
  FLOOR_TYPES,
  CONFIGURATOR_BUDGETS,
  type KitchenConfigRecord,
} from "@/lib/data/operations";
import { updateKitchenConfig, approveKitchenRender, generateKitchenRender, regenerateKitchenRender } from "@/lib/actions/kitchen-render";
import type { KitchenRenderRecord, KitchenRenderRevisionRecord } from "@/lib/data/kitchen-render";
import { formatRelativeTime } from "@/lib/format";

function toggleInArray<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

function ReviewForm({ devisId, config }: { devisId: string; config: KitchenConfigRecord }) {
  const router = useRouter();
  const [form, setForm] = React.useState({
    layout: config.layout,
    island: config.island,
    depth: config.depth,
    hood: config.hood,
    oven: config.oven,
    fridge: config.fridge,
    accessories: config.accessories,
    budget: config.budget,
    floor: config.floor,
    dimensions: config.dimensions,
    additionalInfo: config.additionalInfo,
  });
  const [savingCorrections, setSavingCorrections] = React.useState(false);
  const [approving, setApproving] = React.useState(false);

  async function saveCorrections() {
    setSavingCorrections(true);
    const result = await updateKitchenConfig(devisId, form);
    setSavingCorrections(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Corrections enregistrées");
    router.refresh();
  }

  async function approve() {
    setApproving(true);
    const result = await approveKitchenRender(devisId);
    setApproving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Spécifications approuvées — la génération IA est débloquée");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      {config.photos.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">Photo de référence du client</p>
          <div className="flex flex-wrap gap-3">
            {config.photos.map((p, i) => (
              <img
                key={i}
                src={p.dataUrl}
                alt={p.name}
                className="h-28 w-28 rounded-md border border-border-subtle object-cover"
              />
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>Agencement</Label>
          <Select value={form.layout} onValueChange={(v) => setForm((f) => ({ ...f, layout: v as typeof f.layout }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{KITCHEN_LAYOUTS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Îlot</Label>
          <Select value={form.island} onValueChange={(v) => setForm((f) => ({ ...f, island: v as typeof f.island }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{ISLAND_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Profondeur</Label>
          <Select value={form.depth} onValueChange={(v) => setForm((f) => ({ ...f, depth: v as typeof f.depth }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{DEPTH_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Hotte</Label>
          <Select value={form.hood} onValueChange={(v) => setForm((f) => ({ ...f, hood: v as typeof f.hood }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{HOOD_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Four</Label>
          <Select value={form.oven} onValueChange={(v) => setForm((f) => ({ ...f, oven: v as typeof f.oven }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{OVEN_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Réfrigérateur</Label>
          <Select value={form.fridge} onValueChange={(v) => setForm((f) => ({ ...f, fridge: v as typeof f.fridge }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{FRIDGE_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Budget</Label>
          <Select value={form.budget} onValueChange={(v) => setForm((f) => ({ ...f, budget: v as typeof f.budget }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CONFIGURATOR_BUDGETS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Sol</Label>
          <Select value={form.floor} onValueChange={(v) => setForm((f) => ({ ...f, floor: v as typeof f.floor }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{FLOOR_TYPES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label>Dimensions</Label>
          <Input value={form.dimensions} onChange={(e) => setForm((f) => ({ ...f, dimensions: e.target.value }))} />
        </div>
      </div>

      <div>
        <Label className="mb-2 block">Accessoires</Label>
        <div className="flex flex-wrap gap-2">
          {ACCESSORY_OPTIONS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setForm((f) => ({ ...f, accessories: toggleInArray(f.accessories, a) }))}
              className="focus-ring"
            >
              <Badge variant={form.accessories.includes(a) ? "gold" : "outline"}>{a}</Badge>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Informations complémentaires</Label>
        <Textarea value={form.additionalInfo} onChange={(e) => setForm((f) => ({ ...f, additionalInfo: e.target.value }))} />
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border-subtle pt-4">
        <Button type="button" variant="outline" onClick={saveCorrections} disabled={savingCorrections}>
          Enregistrer les corrections
        </Button>
        <Button type="button" onClick={approve} disabled={approving}>
          <ShieldCheck className="h-4 w-4" /> Approuver et débloquer la génération IA
        </Button>
      </div>
    </div>
  );
}

function RevisionHistory({ revisions, currentRevisionId }: { revisions: KitchenRenderRevisionRecord[]; currentRevisionId: string | null }) {
  if (revisions.length <= 1) return null;
  return (
    <div>
      <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
        <History className="h-3.5 w-3.5" /> Historique des versions ({revisions.length})
      </p>
      <div className="flex flex-wrap gap-3">
        {revisions.map((r) => (
          <div key={r.id} className="flex flex-col items-center gap-1">
            <img
              src={r.imageDataUrl}
              alt={r.feedbackNote ?? "Version initiale"}
              className={`h-20 w-20 rounded-md border object-cover ${r.id === currentRevisionId ? "border-ink-950 ring-2 ring-ink-950/20" : "border-border-subtle"}`}
            />
            <span className="text-[10px] text-text-muted">{formatRelativeTime(r.createdAt)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function KitchenRenderPanel({
  devisId,
  config,
  render,
  revisions,
}: {
  devisId: string;
  config: KitchenConfigRecord;
  render: KitchenRenderRecord | undefined;
  revisions: KitchenRenderRevisionRecord[];
}) {
  const router = useRouter();
  const [generating, setGenerating] = React.useState(false);
  const [feedbackNote, setFeedbackNote] = React.useState("");

  async function generate() {
    setGenerating(true);
    const result = await generateKitchenRender(devisId);
    setGenerating(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Visualisation générée");
    router.refresh();
  }

  async function regenerate() {
    if (feedbackNote.trim().length < 3) {
      toast.error("Décrivez la retouche souhaitée.");
      return;
    }
    setGenerating(true);
    const result = await regenerateKitchenRender(devisId, { feedbackNote });
    setGenerating(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setFeedbackNote("");
    toast.success("Visualisation retouchée");
    router.refresh();
  }

  if (!render || render.status === "pending_review") {
    return <ReviewForm devisId={devisId} config={config} />;
  }

  const currentRevision = revisions.find((r) => r.id === render.currentRevisionId);

  return (
    <div className="flex flex-col gap-5">
      {render.status === "approved" && (
        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border-strong bg-surface-sunken py-8 text-center">
          <ShieldCheck className="h-6 w-6 text-[var(--status-success-fg)]" />
          <p className="text-sm text-text-secondary">
            Spécifications approuvées par {render.approvedBy} — prêt à générer la visualisation.
          </p>
          <Button type="button" onClick={generate} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Générer la visualisation IA
          </Button>
        </div>
      )}

      {render.status === "generating" && (
        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border-strong bg-surface-sunken py-10 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-accent-strong" />
          <p className="text-sm text-text-secondary">Génération en cours…</p>
        </div>
      )}

      {render.status === "failed" && (
        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-[var(--status-danger-fg)]/40 bg-[var(--status-danger-bg)] py-8 text-center">
          <AlertTriangle className="h-6 w-6 text-[var(--status-danger-fg)]" />
          <p className="max-w-md text-sm text-[var(--status-danger-fg)]">{render.errorMessage}</p>
          <Button type="button" variant="outline" onClick={generate} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Réessayer
          </Button>
        </div>
      )}

      {render.status === "generated" && currentRevision && (
        <>
          <img
            src={currentRevision.imageDataUrl}
            alt="Visualisation IA de la cuisine"
            className="w-full rounded-lg border border-border-subtle object-cover"
          />
          <div className="flex flex-col gap-2">
            <Label>Demander une retouche (la même image sera modifiée, pas une nouvelle)</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Textarea
                value={feedbackNote}
                onChange={(e) => setFeedbackNote(e.target.value)}
                placeholder="Ex : des façades plus claires, un plan de travail en marbre…"
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={regenerate} disabled={generating} className="shrink-0">
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Retoucher
              </Button>
            </div>
          </div>
          <RevisionHistory revisions={revisions} currentRevisionId={render.currentRevisionId} />
        </>
      )}
    </div>
  );
}

export { KitchenRenderPanel };
