import type { Metadata } from "next";
import { CalendarClock, Gift, MessagesSquare, ShieldCheck } from "lucide-react";
import { PageHero } from "@/components/marketing/page-hero";
import { ConsultationForm } from "@/components/marketing/consultation-form";

export const metadata: Metadata = {
  title: "Réserver une consultation — ART Cuisine",
  description: "Réservez une consultation gratuite avec un designer ART Cuisine, en atelier ou à domicile.",
};

const STEPS = [
  {
    icon: MessagesSquare,
    title: "Un premier échange",
    description: "Vous nous présentez votre projet, votre espace et vos envies.",
  },
  {
    icon: CalendarClock,
    title: "Un rendez-vous à votre rythme",
    description: "En atelier, à domicile ou en visioconférence — selon ce qui vous convient.",
  },
  {
    icon: ShieldCheck,
    title: "Une étude sans engagement",
    description: "Vous repartez avec des pistes concrètes, sans aucune obligation d'achat.",
  },
];

export default function ConsultationPage() {
  return (
    <>
      <PageHero
        kicker="Consultation"
        title="Réservez un temps d'échange avec nos designers"
        description="Avant tout devis, nous prenons le temps de comprendre votre espace et vos usages. La consultation est gratuite, sans engagement, et dure en moyenne 45 minutes."
        breadcrumb={[{ label: "Consultation" }]}
      />

      <section className="mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-24">
        <div className="grid gap-14 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
          <div>
            <ol className="flex flex-col gap-8">
              {STEPS.map((step, i) => {
                const Icon = step.icon;
                return (
                  <li key={step.title} className="flex gap-5">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border-default text-accent-strong">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <span className="text-xs font-semibold text-text-accent">Étape {i + 1}</span>
                      <h3 className="mt-1 text-sm font-semibold uppercase tracking-wider text-text-primary">
                        {step.title}
                      </h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-text-muted">{step.description}</p>
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className="mt-10 flex items-center gap-3 rounded-md border border-border-subtle bg-surface-sunken px-5 py-4">
              <Gift className="h-5 w-5 shrink-0 text-accent-strong" />
              <p className="text-xs leading-relaxed text-text-muted">
                Gratuite et sans engagement — c&rsquo;est notre façon de nous
                assurer que le courant passe, avant toute chose.
              </p>
            </div>
          </div>

          <ConsultationForm />
        </div>
      </section>
    </>
  );
}
