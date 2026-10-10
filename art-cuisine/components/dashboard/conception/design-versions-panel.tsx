"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles, Wand2, Upload, Columns2, Send, Image as ImageIcon } from "lucide-react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { FormMessage } from "@/components/auth/form-message";
import { WhatsAppShareLink } from "@/components/dashboard/devis/whatsapp-share-link";
import { generateDesignVersion, refineDesignVersion, uploadDesignVersion, sendDesignToClient } from "@/lib/actions/design";
import { formatShortDate } from "@/lib/format";
import { KITCHEN_LAYOUTS, type DesignVersionRecord, type DesignVersionKind, type DesignStatus } from "@/lib/data/operations";
import { DESIGN_VERSION_KINDS, CABINET_FINISHES, WORKTOP_FINISHES } from "@/lib/data/design";

const SOURCE_LABEL: Record<DesignVersionRecord["source"], string> = {
  upload: "Importé",
  generated: "Généré automatiquement",
  refined: "Affiné",
};

const MAX_FILE_BYTES = 8 * 1024 * 1024;

function GenerateDesignDialog({ projectId, hasMeasurements }: { projectId: string; hasMeasurements: boolean }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [island, setIsland] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const result = await generateDesignVersion(projectId, {
      kind: form.get("kind"),
      layout: form.get("layout"),
      island,
      cabinetColor: form.get("cabinetColor"),
      worktopColor: form.get("worktopColor"),
      prompt: form.get("prompt"),
    });

    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("Design généré");
    setOpen(false);
    setIsland(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setError(null); }}>
      <DialogTrigger asChild>
        <Button type="button" size="sm">
          <Sparkles className="h-3.5 w-3.5" /> Générer un design
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Générer un design</DialogTitle>
            <DialogDescription>
              Génération automatique d&rsquo;un plan ou d&rsquo;un rendu à partir des spécifications ci-dessous
              {hasMeasurements ? " et des mesures relevées." : " — aucune mesure n'a encore été relevée, des valeurs par défaut seront utilisées."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-5 px-7 py-6">
            {error && <FormMessage>{error}</FormMessage>}
            <div className="flex flex-col gap-2">
              <Label>Type</Label>
              <Select name="kind" defaultValue={DESIGN_VERSION_KINDS[0]}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DESIGN_VERSION_KINDS.filter((k): k is Exclude<DesignVersionKind, "Design 3D"> => k !== "Design 3D").map((k) => (
                    <SelectItem key={k} value={k}>{k}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Agencement</Label>
              <Select name="layout" defaultValue={KITCHEN_LAYOUTS[0]}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KITCHEN_LAYOUTS.map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label>Façades</Label>
                <Select name="cabinetColor" defaultValue={CABINET_FINISHES[0].hex}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CABINET_FINISHES.map((f) => (
                      <SelectItem key={f.hex} value={f.hex}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Plan de travail</Label>
                <Select name="worktopColor" defaultValue={WORKTOP_FINISHES[0].hex}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {WORKTOP_FINISHES.map((f) => (
                      <SelectItem key={f.hex} value={f.hex}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <label className="flex items-center gap-2.5 text-sm text-text-secondary">
              <Checkbox checked={island} onCheckedChange={(v) => setIsland(v === true)} />
              Îlot central
            </label>
            <div className="flex flex-col gap-2">
              <Label htmlFor="prompt">Spécifications (optionnel)</Label>
              <Textarea id="prompt" name="prompt" placeholder="Ex : évier intégré, coin repas, façades laquées mates…" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">Annuler</Button>
            </DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Génération…" : "Générer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RefineDesignDialog({ projectId, version }: { projectId: string; version: DesignVersionRecord }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const result = await refineDesignVersion(projectId, version.id, { instruction: form.get("instruction") });

    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("Design affiné");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setError(null); }}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          <Wand2 className="h-3.5 w-3.5" /> Affiner
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Affiner la version {version.version}</DialogTitle>
            <DialogDescription>Décrivez la modification souhaitée — une nouvelle version sera générée à partir de celle-ci.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-5 px-7 py-6">
            {error && <FormMessage>{error}</FormMessage>}
            <div className="flex flex-col gap-2">
              <Label htmlFor="instruction">Instruction</Label>
              <Textarea id="instruction" name="instruction" placeholder="Ex : façades en chêne naturel plutôt qu'en blanc laqué" required />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">Annuler</Button>
            </DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Affinage…" : "Affiner"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function UploadDesignDialog({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement | null;
    const file = fileInput?.files?.[0];
    if (!file) {
      setError("Merci de sélectionner un fichier.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("Le fichier dépasse la taille maximale autorisée (8 Mo).");
      return;
    }

    setSubmitting(true);
    const formData = new FormData(form);
    const result = await uploadDesignVersion(projectId, formData);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("Version importée");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setError(null); }}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          <Upload className="h-3.5 w-3.5" /> Importer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Importer une version</DialogTitle>
            <DialogDescription>Plan, design 3D ou rendu réalisé en dehors de l&rsquo;outil.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-5 px-7 py-6">
            {error && <FormMessage>{error}</FormMessage>}
            <div className="flex flex-col gap-2">
              <Label>Type</Label>
              <Select name="kind" defaultValue={DESIGN_VERSION_KINDS[0]}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DESIGN_VERSION_KINDS.map((k) => (
                    <SelectItem key={k} value={k}>{k}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="design-file">Fichier (8 Mo max)</Label>
              <input
                id="design-file"
                name="file"
                type="file"
                accept="image/*,application/pdf"
                className="focus-ring flex h-11 w-full items-center rounded-md border border-border-default bg-surface-raised px-3.5 text-sm text-text-secondary file:mr-3 file:rounded-sm file:border-0 file:bg-surface-sunken file:px-3 file:py-1.5 file:text-xs file:font-medium"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="design-note">Note (optionnel)</Label>
              <Textarea id="design-note" name="note" placeholder="Contexte de cette version…" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">Annuler</Button>
            </DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Import…" : "Importer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SendToClientButton({ projectId, disabled }: { projectId: string; disabled: boolean }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function handleSend() {
    setPending(true);
    const result = await sendDesignToClient(projectId);
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Design envoyé au client");
    router.refresh();
  }

  return (
    <Button type="button" size="sm" variant="outline" onClick={handleSend} disabled={disabled || pending}>
      <Send className="h-3.5 w-3.5" /> {pending ? "Envoi…" : "Envoyer au client"}
    </Button>
  );
}

function CompareDialog({ versions, selectedIds, onClose }: { versions: DesignVersionRecord[]; selectedIds: string[]; onClose: () => void }) {
  const selected = versions.filter((v) => selectedIds.includes(v.id));

  return (
    <Dialog open onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Comparer les versions</DialogTitle>
          <DialogDescription>
            Version {selected[0]?.version} contre version {selected[1]?.version}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 px-7 pb-7 sm:grid-cols-2">
          {selected.map((v) => (
            <div key={v.id} className="flex flex-col gap-2">
              <div className="overflow-hidden rounded-md border border-border-subtle bg-stone-100">
                {v.imageDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.imageDataUrl} alt={`Version ${v.version}`} className="w-full object-contain" />
                ) : (
                  <div className="flex aspect-video items-center justify-center"><ImageIcon className="h-6 w-6 text-text-muted" /></div>
                )}
              </div>
              <p className="text-sm font-medium text-text-primary">Version {v.version} · {v.kind}</p>
              <p className="text-xs text-text-muted">{SOURCE_LABEL[v.source]} · {formatShortDate(v.createdAt)} · {v.createdBy}</p>
              {v.note && <p className="text-xs text-text-secondary">{v.note}</p>}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DesignVersionsPanel({
  projectId,
  hasMeasurements,
  designStatus,
  designClientNote,
  designValidatedAt,
  versions,
  clientName,
  clientPhone,
}: {
  projectId: string;
  hasMeasurements: boolean;
  designStatus: DesignStatus;
  designClientNote: string | null;
  designValidatedAt: string | null;
  versions: DesignVersionRecord[];
  clientName?: string;
  clientPhone?: string | null;
}) {
  const [compareIds, setCompareIds] = React.useState<string[]>([]);
  const [compareOpen, setCompareOpen] = React.useState(false);

  function toggleCompare(id: string) {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((c) => c !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {designClientNote && (
        <Card className="border-[var(--status-warning-fg)]/30 bg-[var(--status-warning-bg)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--status-warning-fg)]">Modification demandée par le client</p>
          <p className="mt-1 text-sm text-text-secondary">{designClientNote}</p>
        </Card>
      )}
      {designStatus === "Validé" && designValidatedAt && (
        <Card className="border-[var(--status-success-fg)]/30 bg-[var(--status-success-bg)] p-4">
          <p className="text-sm text-text-secondary">Design validé par le client le {formatShortDate(designValidatedAt)} — le projet peut passer en production.</p>
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <GenerateDesignDialog projectId={projectId} hasMeasurements={hasMeasurements} />
          <UploadDesignDialog projectId={projectId} />
          {compareIds.length === 2 && (
            <Button type="button" size="sm" variant="outline" onClick={() => setCompareOpen(true)}>
              <Columns2 className="h-3.5 w-3.5" /> Comparer
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <SendToClientButton projectId={projectId} disabled={versions.length === 0} />
          {clientName && (
            <WhatsAppShareLink
              phone={clientPhone ?? null}
              message={`Bonjour ${clientName}, le design de votre cuisine est disponible pour validation dans votre espace client ART Cuisine.`}
            />
          )}
        </div>
      </div>

      {versions.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-muted">Aucune version pour ce projet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {versions.map((v) => (
            <Card key={v.id} className="flex flex-col gap-3 p-3">
              <div className="relative overflow-hidden rounded-md border border-border-subtle bg-stone-100">
                {v.imageDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.imageDataUrl} alt={`Version ${v.version}`} className="aspect-[4/3] w-full object-contain" />
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center"><ImageIcon className="h-6 w-6 text-text-muted" /></div>
                )}
                <label className="absolute right-2 top-2 flex h-7 items-center gap-1.5 rounded-full border border-border-subtle bg-surface-raised/90 px-2 text-[0.65rem] text-text-secondary shadow-elevation-sm">
                  <Checkbox checked={compareIds.includes(v.id)} onCheckedChange={() => toggleCompare(v.id)} />
                  Comparer
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="outline">v{v.version}</Badge>
                <Badge variant="neutral">{v.kind}</Badge>
                <Badge variant={v.source === "upload" ? "neutral" : "info"}>{SOURCE_LABEL[v.source]}</Badge>
              </div>
              <p className="text-xs text-text-muted">{formatShortDate(v.createdAt)} · {v.createdBy}</p>
              {v.prompt && <p className="text-xs text-text-secondary">« {v.prompt} »</p>}
              {v.note && <p className="text-xs text-text-secondary">{v.note}</p>}
              {v.params && <RefineDesignDialog projectId={projectId} version={v} />}
            </Card>
          ))}
        </div>
      )}

      {compareOpen && compareIds.length === 2 && (
        <CompareDialog versions={versions} selectedIds={compareIds} onClose={() => setCompareOpen(false)} />
      )}
    </div>
  );
}

export { DesignVersionsPanel };
