"use client";

import * as React from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, CircleCheck, ImagePlus, Ruler, Mail, Phone, User, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { FormMessage } from "@/components/auth/form-message";
import { OptionCard } from "@/components/marketing/configurator/option-card";
import { StepIndicator } from "@/components/marketing/configurator/step-indicator";
import { submitKitchenConfiguration } from "@/lib/actions/kitchen-config";
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
} from "@/lib/data/operations";
import type {
  KitchenLayout,
  IslandOption,
  DepthOption,
  HoodOption,
  OvenOption,
  FridgeOption,
  AccessoryOption,
  FloorType,
  ConfiguratorBudget,
} from "@/lib/data/operations";
import { cn } from "@/lib/utils";

const LAYOUT_DESCRIPTIONS: Record<KitchenLayout, string> = {
  "En I": "Un seul alignement de meubles, idéal pour les petits espaces.",
  "En L": "Deux pans perpendiculaires, l'implantation la plus polyvalente.",
  "En U": "Trois pans, un maximum de rangement et de plan de travail.",
  Parallèle: "Deux pans face à face, parfait pour les cuisines fermées.",
};

const ISLAND_DESCRIPTIONS: Record<IslandOption, string> = {
  "Avec îlot": "Un bloc central pour cuisiner, dresser ou recevoir.",
  "Sans îlot": "Une implantation compacte, sans élément central.",
};

const DEPTH_DESCRIPTIONS: Record<DepthOption, string> = {
  "Simple profondeur": "Meubles bas classiques, environ 60 cm.",
  "Double profondeur": "Plans de travail plus larges, plus de rangement.",
};

const HOOD_DESCRIPTIONS: Record<HoodOption, string> = {
  "Hotte encastrée": "Intégrée dans un meuble haut ou un plafond technique.",
  "Hotte visible": "Un modèle décoratif, suspendu ou en îlot.",
};

const OVEN_DESCRIPTIONS: Record<OvenOption, string> = {
  "Four colonne encastré": "Positionné à hauteur, dans une colonne dédiée.",
  "Four sous plan de cuisson": "Installé sous la plaque de cuisson.",
  Cuisinière: "Four et plaques réunis dans un seul appareil.",
};

const FRIDGE_DESCRIPTIONS: Record<FridgeOption, string> = {
  "Réfrigérateur encastré": "Intégré derrière une façade sur mesure.",
  "Réfrigérateur 1 porte": "Un modèle simple porte, pose libre.",
  "Réfrigérateur 2 portes": "Un modèle combiné, pose libre.",
};

interface FileMeta {
  name: string;
  sizeLabel: string;
}

interface ConfiguratorState {
  layout: KitchenLayout | null;
  island: IslandOption | null;
  depth: DepthOption | null;
  hood: HoodOption | null;
  oven: OvenOption | null;
  fridge: FridgeOption | null;
  accessories: AccessoryOption[];
  budget: ConfiguratorBudget | null;
  floor: FloorType | null;
  dimensions: string;
  photos: FileMeta[];
  sketches: FileMeta[];
  additionalInfo: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
}

const INITIAL_STATE: ConfiguratorState = {
  layout: null,
  island: null,
  depth: null,
  hood: null,
  oven: null,
  fridge: null,
  accessories: [],
  budget: null,
  floor: null,
  dimensions: "",
  photos: [],
  sketches: [],
  additionalInfo: "",
  contactName: "",
  contactPhone: "",
  contactEmail: "",
};

const STEP_LABELS = ["Agencement", "Équipements", "Accessoires", "Espace & budget", "Coordonnées"];

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function filesToMeta(files: FileList): FileMeta[] {
  return Array.from(files).map((f) => ({ name: f.name, sizeLabel: formatFileSize(f.size) }));
}

function FileDropField({
  label,
  hint,
  files,
  onChange,
  onRemove,
}: {
  label: string;
  hint: string;
  files: FileMeta[];
  onChange: (files: FileList) => void;
  onRemove: (index: number) => void;
}) {
  const inputId = React.useId();

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={inputId}>{label}</Label>
      <label
        htmlFor={inputId}
        className="focus-ring flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed border-border-strong bg-surface-sunken px-5 py-6 text-center transition-colors hover:border-ink-950/50"
      >
        <ImagePlus className="h-5 w-5 text-text-muted" />
        <span className="text-xs text-text-muted">{hint}</span>
        <input
          id={inputId}
          type="file"
          accept="image/*,application/pdf"
          multiple
          className="sr-only"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) onChange(e.target.files);
            e.target.value = "";
          }}
        />
      </label>
      {files.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center justify-between gap-2 rounded-md border border-border-subtle bg-surface-raised px-3 py-2 text-xs text-text-secondary"
            >
              <span className="truncate">{f.name}</span>
              <span className="flex shrink-0 items-center gap-2 text-text-muted">
                {f.sizeLabel}
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  className="focus-ring rounded-sm text-text-muted hover:text-text-primary"
                  aria-label={`Retirer ${f.name}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function KitchenConfigurator({ referenceLabel }: { referenceLabel?: string }) {
  const [step, setStep] = React.useState(0);
  const [data, setData] = React.useState<ConfiguratorState>(() =>
    referenceLabel
      ? { ...INITIAL_STATE, additionalInfo: `Style de référence souhaité : ${referenceLabel}.` }
      : INITIAL_STATE,
  );
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [result, setResult] = React.useState<{ ref: string } | null>(null);

  function update<K extends keyof ConfiguratorState>(key: K, value: ConfiguratorState[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  function toggleAccessory(option: AccessoryOption) {
    setData((prev) => ({
      ...prev,
      accessories: prev.accessories.includes(option)
        ? prev.accessories.filter((a) => a !== option)
        : [...prev.accessories, option],
    }));
  }

  function canAdvance(): boolean {
    if (step === 0) return Boolean(data.layout && data.island && data.depth);
    if (step === 1) return Boolean(data.hood && data.oven && data.fridge);
    if (step === 2) return true;
    if (step === 3) return Boolean(data.budget && data.floor && data.dimensions.trim());
    return true;
  }

  function goNext() {
    if (!canAdvance()) {
      setError("Merci de compléter cette étape avant de continuer.");
      return;
    }
    setError(null);
    setStep((s) => Math.min(s + 1, STEP_LABELS.length - 1));
  }

  function goBack() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!data.contactName.trim() || !data.contactPhone.trim() || !data.contactEmail.trim()) {
      setError("Merci de renseigner vos coordonnées.");
      return;
    }

    setError(null);
    setSubmitting(true);
    const res = await submitKitchenConfiguration(data);
    setSubmitting(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }

    setResult({ ref: res.data.devisRef });
    toast.success("Votre configuration est enregistrée");
  }

  if (result) {
    return (
      <div className="rounded-lg border border-border-subtle bg-surface-raised p-7 shadow-elevation-sm sm:p-9">
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--status-success-bg)] text-[var(--status-success-fg)]">
            <CircleCheck className="h-7 w-7" />
          </span>
          <h3 className="font-display text-xl font-medium text-text-primary">Votre configuration est enregistrée</h3>
          <p className="max-w-sm text-sm text-text-muted">
            Référence <span className="font-medium text-text-primary">{result.ref}</span>. Notre équipe commerciale
            étudie votre projet et revient vers vous sous 24 à 48h ouvrées avec un devis chiffré.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setData(INITIAL_STATE);
              setStep(0);
              setResult(null);
            }}
          >
            Configurer une nouvelle cuisine
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-border-subtle bg-surface-raised p-7 shadow-elevation-sm sm:p-9"
    >
      {referenceLabel && (
        <div className="mb-6">
          <FormMessage variant="success">
            Vous configurez une cuisine à propos du style <strong>{referenceLabel}</strong>.
          </FormMessage>
        </div>
      )}

      <StepIndicator steps={STEP_LABELS} current={step} />

      <div className="mt-8 flex flex-col gap-8">
        {error && <FormMessage>{error}</FormMessage>}

        {step === 0 && (
          <>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Agencement de la cuisine</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {KITCHEN_LAYOUTS.map((l) => (
                  <OptionCard
                    key={l}
                    label={l}
                    description={LAYOUT_DESCRIPTIONS[l]}
                    selected={data.layout === l}
                    onSelect={() => update("layout", l)}
                  />
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Îlot central</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {ISLAND_OPTIONS.map((o) => (
                  <OptionCard
                    key={o}
                    label={o}
                    description={ISLAND_DESCRIPTIONS[o]}
                    selected={data.island === o}
                    onSelect={() => update("island", o)}
                  />
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Profondeur des meubles</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {DEPTH_OPTIONS.map((o) => (
                  <OptionCard
                    key={o}
                    label={o}
                    description={DEPTH_DESCRIPTIONS[o]}
                    selected={data.depth === o}
                    onSelect={() => update("depth", o)}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Hotte</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {HOOD_OPTIONS.map((o) => (
                  <OptionCard
                    key={o}
                    label={o}
                    description={HOOD_DESCRIPTIONS[o]}
                    selected={data.hood === o}
                    onSelect={() => update("hood", o)}
                  />
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Four</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {OVEN_OPTIONS.map((o) => (
                  <OptionCard
                    key={o}
                    label={o}
                    description={OVEN_DESCRIPTIONS[o]}
                    selected={data.oven === o}
                    onSelect={() => update("oven", o)}
                  />
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Réfrigérateur</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {FRIDGE_OPTIONS.map((o) => (
                  <OptionCard
                    key={o}
                    label={o}
                    description={FRIDGE_DESCRIPTIONS[o]}
                    selected={data.fridge === o}
                    onSelect={() => update("fridge", o)}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Accessoires souhaités</h3>
            <p className="mt-1 text-xs text-text-muted">Sélectionnez tout ce qui vous intéresse — optionnel.</p>
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
              {ACCESSORY_OPTIONS.map((a) => (
                <OptionCard
                  key={a}
                  label={a}
                  selected={data.accessories.includes(a)}
                  onSelect={() => toggleAccessory(a)}
                  compact
                />
              ))}
            </div>
            {data.accessories.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {data.accessories.map((a) => (
                  <Badge key={a} variant="gold">{a}</Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Budget estimatif</Label>
              <Select value={data.budget ?? undefined} onValueChange={(v) => update("budget", v as ConfiguratorBudget)}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  {CONFIGURATOR_BUDGETS.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Type de sol</Label>
              <Select value={data.floor ?? undefined} onValueChange={(v) => update("floor", v as FloorType)}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  {FLOOR_TYPES.map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="config-dimensions">Dimensions approximatives</Label>
              <Input
                id="config-dimensions"
                icon={<Ruler />}
                placeholder="Ex : 4m x 3m, ou surface en m²"
                value={data.dimensions}
                onChange={(e) => update("dimensions", e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <FileDropField
                label="Photos de votre espace actuel"
                hint="Glissez vos photos, ou cliquez pour parcourir"
                files={data.photos}
                onChange={(files) => update("photos", [...data.photos, ...filesToMeta(files)])}
                onRemove={(i) => update("photos", data.photos.filter((_, idx) => idx !== i))}
              />
            </div>
            <div className="sm:col-span-2">
              <FileDropField
                label="Croquis ou plan (si vous en avez un)"
                hint="Glissez vos croquis, ou cliquez pour parcourir"
                files={data.sketches}
                onChange={(files) => update("sketches", [...data.sketches, ...filesToMeta(files)])}
                onRemove={(i) => update("sketches", data.sketches.filter((_, idx) => idx !== i))}
              />
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="config-info">Informations complémentaires</Label>
              <Textarea
                id="config-info"
                placeholder="Contraintes, envies particulières, délais souhaités…"
                value={data.additionalInfo}
                onChange={(e) => update("additionalInfo", e.target.value)}
              />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="config-name">Nom complet</Label>
              <Input
                id="config-name"
                icon={<User />}
                placeholder="Votre nom"
                value={data.contactName}
                onChange={(e) => update("contactName", e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="config-phone">Téléphone</Label>
              <Input
                id="config-phone"
                icon={<Phone />}
                placeholder="+213 5 55 12 34 56"
                value={data.contactPhone}
                onChange={(e) => update("contactPhone", e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="config-email">E-mail</Label>
              <Input
                id="config-email"
                type="email"
                icon={<Mail />}
                placeholder="vous@exemple.com"
                value={data.contactEmail}
                onChange={(e) => update("contactEmail", e.target.value)}
                required
              />
            </div>

            <div className="rounded-md border border-border-subtle bg-surface-sunken p-5 sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Récapitulatif</p>
              <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-xs text-text-secondary sm:grid-cols-2">
                <div>Agencement : <span className="font-medium text-text-primary">{data.layout} · {data.island} · {data.depth}</span></div>
                <div>Équipements : <span className="font-medium text-text-primary">{data.hood}, {data.oven}, {data.fridge}</span></div>
                <div>Accessoires : <span className="font-medium text-text-primary">{data.accessories.length > 0 ? data.accessories.join(", ") : "Aucun"}</span></div>
                <div>Budget : <span className="font-medium text-text-primary">{data.budget}</span></div>
                <div>Sol : <span className="font-medium text-text-primary">{data.floor}</span></div>
                <div>Dimensions : <span className="font-medium text-text-primary">{data.dimensions}</span></div>
              </dl>
            </div>
          </div>
        )}
      </div>

      <div className={cn("mt-9 flex items-center", step === 0 ? "justify-end" : "justify-between")}>
        {step > 0 && (
          <Button type="button" variant="ghost" onClick={goBack}>
            <ArrowLeft className="h-4 w-4" /> Précédent
          </Button>
        )}
        {step < STEP_LABELS.length - 1 ? (
          <Button type="button" variant="gold" onClick={goNext}>
            Suivant <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="submit" variant="gold" size="lg" disabled={submitting}>
            {submitting ? "Envoi en cours…" : "Envoyer ma demande de devis"}
          </Button>
        )}
      </div>
    </form>
  );
}

export { KitchenConfigurator };
