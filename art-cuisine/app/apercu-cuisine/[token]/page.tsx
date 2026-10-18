import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getKitchenRenderByShareToken, getKitchenRenderRevisions } from "@/lib/data/kitchen-render";
import { getDevisById } from "@/lib/data/devis";
import { getConfigByDevisId } from "@/lib/data/kitchen-config";
import { formatCurrencyDA } from "@/lib/format";
import { KitchenPreviewDecision } from "@/components/marketing/kitchen-preview-decision";

export async function generateMetadata({ params }: PageProps<"/apercu-cuisine/[token]">): Promise<Metadata> {
  const { token } = await params;
  const render = await getKitchenRenderByShareToken(token);
  const devis = render ? await getDevisById(render.devisId) : undefined;
  return { title: devis ? `Votre cuisine ${devis.ref} — ART Cuisine` : "Aperçu de cuisine — ART Cuisine" };
}

export default async function KitchenPreviewSharePage({ params }: PageProps<"/apercu-cuisine/[token]">) {
  const { token } = await params;
  const render = await getKitchenRenderByShareToken(token);
  if (!render || !render.sharedAt || render.status !== "generated") notFound();

  const devis = await getDevisById(render.devisId);
  if (!devis) notFound();

  const config = await getConfigByDevisId(devis.id);
  const revisions = await getKitchenRenderRevisions(render.id);
  const current = revisions.find((r) => r.id === render.currentRevisionId);
  if (!current) notFound();

  const SPEC_ROWS: [string, string][] = config
    ? [
        ["Agencement", `Cuisine ${config.layout}`],
        ["Îlot", config.island],
        ["Hotte", config.hood],
        ["Four", config.oven],
        ["Réfrigérateur", config.fridge],
        ["Sol", config.floor],
      ]
    : [];

  return (
    <div className="min-h-screen bg-surface-sunken py-10">
      <div className="mx-auto max-w-3xl rounded-lg border border-border-subtle bg-white p-8 shadow-elevation-sm sm:p-10">
        <div className="flex items-start justify-between border-b border-border-subtle pb-6">
          <div>
            <p className="font-display text-xl font-medium text-ink-950">ART CUISINE</p>
            <p className="mt-1 text-xs uppercase tracking-widest text-stone-500">Aperçu de votre future cuisine</p>
          </div>
          <div className="text-right">
            <p className="font-display text-lg font-medium text-ink-950">{devis.ref}</p>
            <p className="mt-1 text-xs text-stone-500">{devis.projectLabel}</p>
          </div>
        </div>

        <div className="mt-6">
          {/* eslint-disable-next-line @next/next/no-img-element -- base64 data URL, not a static asset */}
          <img
            src={current.imageDataUrl}
            alt="Visualisation de votre future cuisine"
            className="w-full rounded-lg border border-stone-200 object-cover"
          />
        </div>

        {config?.photos[0]?.dataUrl && (
          <div className="mt-4 flex items-center gap-3">
            <p className="text-xs text-stone-500">Votre photo d&rsquo;origine :</p>
            {/* eslint-disable-next-line @next/next/no-img-element -- base64 data URL, not a static asset */}
            <img src={config.photos[0].dataUrl} alt="Photo d'origine" className="h-14 w-14 rounded-md border border-stone-200 object-cover" />
          </div>
        )}

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Votre projet</p>
            <dl className="mt-2 flex flex-col gap-1.5 text-sm">
              {SPEC_ROWS.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 text-stone-600">
                  <span>{label}</span>
                  <span className="font-medium text-ink-950">{value}</span>
                </div>
              ))}
            </dl>
          </div>
          <div className="rounded-md border border-stone-200 bg-stone-50 p-5 text-right">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Montant du devis</p>
            <p className="mt-1.5 font-display text-2xl font-medium text-ink-950">{formatCurrencyDA(devis.amount)}</p>
          </div>
        </div>

        <div className="mt-8 border-t border-stone-200 pt-6">
          <KitchenPreviewDecision token={token} existingDecision={render.customerDecision} />
        </div>

        <div className="mt-8 border-t border-stone-200 pt-6 text-xs leading-relaxed text-stone-500">
          <p>Cette visualisation est une proposition générée par intelligence artificielle à titre indicatif — le rendu final en atelier peut différer légèrement.</p>
          <p className="mt-1">ART Cuisine — contact@art-cuisine.dz — +213 5 55 00 00 00</p>
        </div>
      </div>
    </div>
  );
}
