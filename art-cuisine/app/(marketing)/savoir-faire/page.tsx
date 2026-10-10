import type { Metadata } from "next";
import { Compass, Hammer, Lightbulb, Ruler, Wrench, Layers3 } from "lucide-react";
import { PageHero } from "@/components/marketing/page-hero";
import { ProcessSection } from "@/components/marketing/process-section";
import { CraftsmanshipSection } from "@/components/marketing/craftsmanship-section";
import { ConsultationCta } from "@/components/marketing/consultation-cta";
import { Kicker } from "@/components/ui/section-heading";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Notre savoir-faire — ART Cuisine",
  description: "La conception, la menuiserie et les finitions ART Cuisine, expliquées étape par étape.",
};

const FEATURED = [
  {
    icon: Compass,
    title: "Design & agencement",
    description:
      "Chaque projet démarre par une prise de mesures précise et une étude d'usage : où circule-t-on, où range-t-on, comment la lumière traverse la pièce. Nos designers modélisent ensuite votre cuisine en plans 3D détaillés, ajustés avec vous jusqu'à validation.",
    image: "/images/company/equipe.png",
  },
  {
    icon: Ruler,
    title: "Menuiserie sur mesure",
    description:
      "Caissons, façades et rangements sont taillés au millimètre dans notre atelier, sur commande numérique pour la précision et à la main pour les finitions. Rien n'est standard : chaque pièce est fabriquée pour votre projet, et lui seul.",
    image: "/images/kitchens/naturelle.webp",
  },
  {
    icon: Hammer,
    title: "Finitions & quincaillerie",
    description:
      "Laque, bois huilé, métal brossé : nos finisseurs appliquent chaque traitement à la main, en plusieurs couches, pour un rendu impeccable et durable. La quincaillerie — charnières, coulisses, poignées — est sélectionnée pour tenir des années d'usage quotidien.",
    image: "/images/kitchens/industrielle.webp",
  },
];

const COMPACT = [
  { icon: Layers3, title: "Pierre & plans de travail", description: "Marbre, granit et quartz façonnés dans notre atelier de taille." },
  { icon: Lightbulb, title: "Domotique & éclairage", description: "Éclairage d'ambiance, prises intégrées et équipements connectés." },
  { icon: Wrench, title: "Accompagnement projet", description: "Un interlocuteur unique du premier croquis à la pose finale." },
];

export default function SavoirFairePage() {
  return (
    <>
      <PageHero
        kicker="Notre savoir-faire"
        title="Une expertise complète, sous un même toit"
        description="De la conception à l'installation, chaque corps de métier est maîtrisé en interne, par la même équipe — pour une cohérence totale du premier plan au dernier réglage."
        breadcrumb={[{ label: "Notre savoir-faire" }]}
      />

      <section className="mx-auto flex max-w-7xl flex-col gap-20 px-6 py-20 lg:px-10 lg:py-28">
        {FEATURED.map((item, i) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className={cn(
                "grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16",
              )}
            >
              <div className={cn(i % 2 === 1 && "lg:order-2")}>
                <span className="flex h-12 w-12 items-center justify-center rounded-full border border-border-default text-accent-strong">
                  <Icon className="h-5 w-5" />
                </span>
                <h2 className="mt-6 font-display text-2xl font-medium text-text-primary sm:text-3xl">
                  {item.title}
                </h2>
                <p className="mt-4 max-w-lg text-[0.9375rem] leading-relaxed text-text-secondary">
                  {item.description}
                </p>
              </div>
              <div className={cn("relative aspect-[4/3] overflow-hidden rounded-lg border border-border-subtle shadow-elevation-md", i % 2 === 1 && "lg:order-1")}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
              </div>
            </div>
          );
        })}
      </section>

      <section className="border-t border-border-subtle bg-surface-sunken">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-24">
          <Kicker>Et aussi</Kicker>
          <h2 className="mt-5 max-w-xl font-display text-3xl font-medium leading-[1.15] text-text-primary sm:text-4xl">
            Trois autres métiers, la même exigence
          </h2>
          <div className="mt-12 grid gap-px overflow-hidden rounded-lg border border-border-subtle bg-border-subtle sm:grid-cols-3">
            {COMPACT.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex flex-col gap-4 bg-surface-raised p-7">
                <span className="flex h-11 w-11 items-center justify-center rounded-md bg-surface-sunken text-accent-strong">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-text-primary">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-muted">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ProcessSection />
      <CraftsmanshipSection />
      <ConsultationCta />
    </>
  );
}
