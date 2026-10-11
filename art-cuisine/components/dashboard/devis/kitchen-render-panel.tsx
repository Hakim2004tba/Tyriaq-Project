"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles, ShieldCheck, RotateCcw, History, AlertTriangle, Loader2, Paintbrush, Undo2, Redo2, Columns2, Eraser } from "lucide-react";
import { cn } from "@/lib/utils";
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
import {
  updateKitchenConfig,
  approveKitchenRender,
  generateKitchenRender,
  regenerateKitchenRender,
  restoreKitchenRenderRevision,
} from "@/lib/actions/kitchen-render";
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

function RevisionHistory({
  revisions,
  currentRevisionId,
  onRestore,
  busy,
}: {
  revisions: KitchenRenderRevisionRecord[];
  currentRevisionId: string | null;
  onRestore: (revisionId: string) => void;
  busy: boolean;
}) {
  if (revisions.length <= 1) return null;
  return (
    <div>
      <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
        <History className="h-3.5 w-3.5" /> Historique des versions ({revisions.length}) — cliquez pour restaurer
      </p>
      <div className="flex flex-wrap gap-3">
        {revisions.map((r) => (
          <button
            key={r.id}
            type="button"
            disabled={busy || r.id === currentRevisionId}
            onClick={() => onRestore(r.id)}
            className="focus-ring flex flex-col items-center gap-1 disabled:cursor-default"
            title={r.feedbackNote ?? "Version initiale"}
          >
            <img
              src={r.imageDataUrl}
              alt={r.feedbackNote ?? "Version initiale"}
              className={`h-20 w-20 rounded-md border object-cover ${r.id === currentRevisionId ? "border-ink-950 ring-2 ring-ink-950/20" : "border-border-subtle hover:border-ink-950/50"}`}
            />
            <span className="text-[10px] text-text-muted">{formatRelativeTime(r.createdAt)}</span>
          </button>
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
        <RenderWorkspace
          devisId={devisId}
          render={render}
          revisions={revisions}
          originalPhotoUrl={config.photos[0]?.dataUrl}
        />
      )}
    </div>
  );
}

/** The current image, a brush tool to mark a region, an instruction field, undo/redo, before/after compare and restorable history — everything after a render exists. */
function RenderWorkspace({
  devisId,
  render,
  revisions,
  originalPhotoUrl,
}: {
  devisId: string;
  render: KitchenRenderRecord;
  revisions: KitchenRenderRevisionRecord[];
  originalPhotoUrl?: string;
}) {
  const router = useRouter();
  const sortedAsc = React.useMemo(
    () => [...revisions].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [revisions],
  );
  const currentIndex = sortedAsc.findIndex((r) => r.id === render.currentRevisionId);
  const current = sortedAsc[currentIndex];
  const canUndo = currentIndex > 0;
  const canRedo = currentIndex >= 0 && currentIndex < sortedAsc.length - 1;

  const [busy, setBusy] = React.useState(false);
  const [instruction, setInstruction] = React.useState("");
  const [brushing, setBrushing] = React.useState(false);
  const [hasStrokes, setHasStrokes] = React.useState(false);
  const [compareMode, setCompareMode] = React.useState(false);
  const imgRef = React.useRef<HTMLImageElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const drawingRef = React.useRef(false);

  function setupCanvas() {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    setHasStrokes(false);
  }

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!brushing) return;
    drawingRef.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!brushing || !drawingRef.current) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const { x, y } = getPos(e);
    ctx.lineWidth = Math.max(canvas.width * 0.03, 20);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(220, 38, 38, 0.55)";
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasStrokes(true);
  }

  function handlePointerUp() {
    drawingRef.current = false;
  }

  function clearBrush() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    setHasStrokes(false);
  }

  function buildOverlayDataUrl(): string | undefined {
    if (!hasStrokes || !imgRef.current || !canvasRef.current) return undefined;
    const out = document.createElement("canvas");
    out.width = imgRef.current.naturalWidth;
    out.height = imgRef.current.naturalHeight;
    const ctx = out.getContext("2d")!;
    ctx.drawImage(imgRef.current, 0, 0, out.width, out.height);
    ctx.drawImage(canvasRef.current, 0, 0, out.width, out.height);
    return out.toDataURL("image/jpeg", 0.92);
  }

  async function submitEdit() {
    if (instruction.trim().length < 3) {
      toast.error("Décrivez le changement souhaité.");
      return;
    }
    setBusy(true);
    const regionOverlayDataUrl = buildOverlayDataUrl();
    const result = await regenerateKitchenRender(devisId, { feedbackNote: instruction, regionOverlayDataUrl });
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setInstruction("");
    clearBrush();
    setBrushing(false);
    toast.success("Visualisation retouchée");
    router.refresh();
  }

  async function restore(revisionId: string) {
    setBusy(true);
    const result = await restoreKitchenRenderRevision(devisId, revisionId);
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  if (!current) return null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => restore(sortedAsc[currentIndex - 1].id)}
            disabled={!canUndo || busy}
          >
            <Undo2 className="h-3.5 w-3.5" /> Annuler
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => restore(sortedAsc[currentIndex + 1].id)}
            disabled={!canRedo || busy}
          >
            <Redo2 className="h-3.5 w-3.5" /> Rétablir
          </Button>
        </div>
        {originalPhotoUrl && (
          <Button type="button" size="sm" variant="outline" onClick={() => setCompareMode((m) => !m)}>
            <Columns2 className="h-3.5 w-3.5" /> {compareMode ? "Voir le résultat" : "Comparer avant / après"}
          </Button>
        )}
      </div>

      {compareMode && originalPhotoUrl ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-text-muted">Avant</p>
            <img src={originalPhotoUrl} alt="Photo d'origine du client" className="w-full rounded-lg border border-border-subtle object-cover" />
          </div>
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-text-muted">Après</p>
            <img src={current.imageDataUrl} alt="Visualisation IA de la cuisine" className="w-full rounded-lg border border-border-subtle object-cover" />
          </div>
        </div>
      ) : (
        <div className="relative select-none overflow-hidden rounded-lg border border-border-subtle">
          {/* eslint-disable-next-line @next/next/no-img-element -- base64 data URL, not a static asset */}
          <img ref={imgRef} src={current.imageDataUrl} onLoad={setupCanvas} alt="Visualisation IA de la cuisine" className="w-full" />
          <canvas
            ref={canvasRef}
            className={cn("absolute inset-0 h-full w-full touch-none", brushing ? "cursor-crosshair" : "pointer-events-none")}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant={brushing ? "primary" : "outline"} onClick={() => setBrushing((b) => !b)}>
          <Paintbrush className="h-3.5 w-3.5" /> {brushing ? "Pinceau actif" : "Sélectionner une zone à modifier"}
        </Button>
        {hasStrokes && (
          <Button type="button" size="sm" variant="ghost" onClick={clearBrush}>
            <Eraser className="h-3.5 w-3.5" /> Effacer la sélection
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label>
          {hasStrokes ? "Décrivez le changement pour la zone surlignée en rouge" : "Décrivez le changement souhaité (image entière)"}
        </Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="Ex : des façades plus claires, un plan de travail en marbre…"
            className="flex-1"
          />
          <Button type="button" onClick={submitEdit} disabled={busy} className="shrink-0">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Appliquer
          </Button>
        </div>
      </div>

      <RevisionHistory revisions={sortedAsc} currentRevisionId={render.currentRevisionId} onRestore={restore} busy={busy} />
    </div>
  );
}

export { KitchenRenderPanel };
