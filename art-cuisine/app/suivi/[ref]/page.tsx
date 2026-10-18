import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CircleCheck, Circle, Sparkles } from "lucide-react";
import { getDevisByRef } from "@/lib/data/devis";
import { getKitchenRenderForDevis } from "@/lib/data/kitchen-render";
import { formatCurrencyDA, formatShortDate } from "@/lib/format";
import type { DevisStatus } from "@/lib/data/operations";

export async function generateMetadata({ params }: PageProps<"/suivi/[ref]">): Promise<Metadata> {
  const { ref } = await params;
  return { title: `Suivi ${ref} — ART Cuisine` };
}

const STEPS: { status: DevisStatus; label: string }[] = [
  { status: "Brouillon", label: "Demande reçue" },
  { status: "Envoyé", label: "Devis envoyé" },
  { status: "Vu", label: "Devis consulté" },
  { status: "Accepté", label: "Devis accepté" },
];

function stepIndexFor(status: DevisStatus): number {
  if (status === "Refusé" || status === "Modification demandée") return 1; // still "sent", just needs a decision
  const i = STEPS.findIndex((s) => s.status === status);
  return i === -1 ? 0 : i;
}

export default async function TrackOrderPage({ params }: PageProps<"/suivi/[ref]">) {
  const { ref } = await params;
  const devis = await getDevisByRef(decodeURIComponent(ref));
  if (!devis) notFound();

  const render = await getKitchenRenderForDevis(devis.id);
  const activeStep = stepIndexFor(devis.status);

  return (
    <div className="min-h-screen bg-surface-sunken py-10">
      <div className="mx-auto max-w-2xl rounded-lg border border-border-subtle bg-white p-8 shadow-elevation-sm sm:p-10">
        <div className="border-b border-stone-200 pb-6">
          <p className="font-display text-xl font-medium text-ink-950">ART CUISINE</p>
          <p className="mt-1 text-xs uppercase tracking-widest text-stone-500">Suivi de votre demande</p>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Votre référence</p>
            <p className="mt-1 font-display text-2xl font-medium text-ink-950">{devis.ref}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-stone-500">{devis.projectLabel}</p>
            {devis.amount > 0 && <p className="mt-1 text-lg font-medium text-ink-950">{formatCurrencyDA(devis.amount)}</p>}
          </div>
        </div>

        {(devis.status === "Refusé" || devis.status === "Modification demandée") && (
          <div className="mt-6 rounded-md bg-accent-soft px-4 py-3 text-sm text-ink-950">
            Statut actuel : <span className="font-medium">{devis.status}</span>. Notre équipe a été notifiée et revient vers vous.
          </div>
        )}

        <ol className="mt-8 flex flex-col gap-0">
          {STEPS.map((step, i) => {
            const done = i <= activeStep;
            return (
              <li key={step.status} className="flex gap-3 pb-6 last:pb-0">
                <div className="flex flex-col items-center">
                  {done ? (
                    <CircleCheck className="h-5 w-5 text-[var(--status-success-fg)]" />
                  ) : (
                    <Circle className="h-5 w-5 text-stone-300" />
                  )}
                  {i < STEPS.length - 1 && <div className={`mt-1 h-full w-px flex-1 ${done ? "bg-[var(--status-success-fg)]/40" : "bg-stone-200"}`} />}
                </div>
                <p className={`text-sm ${done ? "font-medium text-ink-950" : "text-stone-400"}`}>{step.label}</p>
              </li>
            );
          })}
        </ol>

        {render?.sharedAt && render.status === "generated" && render.shareToken && (
          <a
            href={`/apercu-cuisine/${render.shareToken}`}
            className="mt-6 flex items-center justify-center gap-2 rounded-md bg-ink-950 px-5 py-3 text-sm font-medium text-white hover:bg-ink-900"
          >
            <Sparkles className="h-4 w-4" /> Voir la visualisation de votre future cuisine
          </a>
        )}

        <div className="mt-8 border-t border-stone-200 pt-6 text-xs leading-relaxed text-stone-500">
          <p>Devis émis le {formatShortDate(devis.createdAt)}, valide jusqu&rsquo;au {formatShortDate(devis.validUntil)}.</p>
          <p className="mt-1">Gardez cette page en favori ou votre référence <span className="font-medium text-stone-700">{devis.ref}</span> pour suivre l&rsquo;avancement.</p>
          <p className="mt-1">ART Cuisine — contact@art-cuisine.dz — +213 5 55 00 00 00</p>
        </div>
      </div>
    </div>
  );
}
