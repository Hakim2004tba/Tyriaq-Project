import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageHero } from "@/components/marketing/page-hero";
import { SectionHeading, Kicker } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Nos cuisines — ART Cuisine",
  description: "Les styles et agencements de cuisines sur mesure conçus par ART Cuisine.",
};

const STYLES: { name: string; image: string; description: string }[] = [
  { name: "Épurée", image: "/images/kitchens/epuree.webp", description: "Lignes tendues, façades unies, poignées discrètes — l'essentiel, parfaitement exécuté." },
  { name: "Contemporaine", image: "/images/kitchens/contemporaine.webp", description: "Contrastes de matières et de teintes, îlots généreux, pensée pour la vie sociale." },
  { name: "Naturelle", image: "/images/kitchens/naturelle.webp", description: "Bois massif, pierre brute et teintes sable pour une ambiance chaleureuse." },
  { name: "Minérale", image: "/images/kitchens/minerale.png", description: "Pierre et béton en continuité, pour un rendu sobre et architectural." },
  { name: "Traditionnelle", image: "/images/kitchens/traditionnelle.webp", description: "Moulures discrètes, bois patiné et quincaillerie en laiton vieilli." },
  { name: "Industrielle", image: "/images/kitchens/industrielle.webp", description: "Métal noir, béton ciré et structures apparentes, esprit atelier." },
];

const LAYOUTS = [
  { name: "Cuisine en L", description: "L'agencement le plus polyvalent, adapté à la majorité des espaces." },
  { name: "Cuisine en U", description: "Trois plans de travail pour une circulation optimale à plusieurs." },
  { name: "Cuisine en I", description: "Un linéaire unique, idéal pour les petites surfaces et les studios." },
  { name: "Cuisine parallèle", description: "Deux plans face à face pour un espace tout en longueur." },
  { name: "Cuisine avec îlot", description: "Un cœur central qui organise la pièce et invite au partage." },
];

export default function NosCuisinesPage() {
  return (
    <>
      <PageHero
        kicker="Nos cuisines"
        title="Un style pour chaque manière de vivre"
        description="Chaque cuisine ART Cuisine part d'un style et d'un agencement adaptés à votre espace — puis se construit entièrement sur mesure, sans jamais se répéter."
        breadcrumb={[{ label: "Nos cuisines" }]}
      />

      <section className="mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-24">
        <SectionHeading kicker="Styles" title="Six univers, une même exigence" className="mb-14" />

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {STYLES.map((style) => (
            <Link
              key={style.name}
              href={{ pathname: "/realisations", query: { style: style.name } }}
              className="focus-ring group block overflow-hidden rounded-lg border border-border-subtle bg-surface-raised shadow-elevation-sm transition-shadow hover:shadow-elevation-md"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={style.image}
                  alt={style.name}
                  className="h-full w-full object-cover transition-transform duration-700 ease-[var(--ease-editorial)] group-hover:scale-[1.06]"
                />
              </div>
              <div className="p-5">
                <h3 className="font-display text-lg font-medium text-text-primary">{style.name}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-text-muted">{style.description}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-text-accent">
                  Voir les réalisations <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t border-border-subtle bg-surface-sunken">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-24">
          <Kicker>Agencements</Kicker>
          <h2 className="mt-5 max-w-xl font-display text-3xl font-medium leading-[1.15] text-text-primary sm:text-4xl">
            Le bon agencement pour votre espace
          </h2>

          <div className="mt-12 grid gap-px overflow-hidden rounded-lg border border-border-subtle bg-border-subtle sm:grid-cols-2 lg:grid-cols-5">
            {LAYOUTS.map((layout) => (
              <div key={layout.name} className="flex flex-col gap-2 bg-surface-raised p-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-text-primary">
                  {layout.name}
                </h3>
                <p className="text-sm leading-relaxed text-text-muted">{layout.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-grain bg-grain-dark relative overflow-hidden bg-ink-950">
        <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-6 py-16 lg:flex-row lg:items-center lg:px-10">
          <div>
            <Kicker>Votre projet</Kicker>
            <h2 className="mt-4 font-display text-3xl font-medium text-text-inverse sm:text-4xl">
              Un style vous a séduit ?
            </h2>
            <p className="mt-3 max-w-md text-sm text-text-inverse-muted">
              Parlons-en et donnons-lui la forme de votre propre cuisine.
            </p>
          </div>
          <Button variant="gold" size="lg" asChild>
            <Link href="/devis">Demander un devis →</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
