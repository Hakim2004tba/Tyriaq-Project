import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/marketing/page-hero";
import { SectionHeading, Kicker } from "@/components/ui/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MATERIALS, FINISHES } from "@/lib/data/materials";

export const metadata: Metadata = {
  title: "Matériaux & finitions — ART Cuisine",
  description: "Le catalogue des matériaux et finitions disponibles pour votre cuisine sur mesure.",
};

export default function MateriauxPage() {
  return (
    <>
      <PageHero
        kicker="Matériaux & finitions"
        title="Des matériaux d'exception, choisis un à un"
        description="Nous sélectionnons chaque matériau pour sa tenue dans le temps autant que pour son caractère — puis nous le travaillons dans notre atelier, sans sous-traitance."
        breadcrumb={[{ label: "Matériaux & finitions" }]}
      />

      <section className="mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-24">
        <SectionHeading kicker="Matériaux" title="Cinq matières, une infinité de combinaisons" className="mb-14" />

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {MATERIALS.map((material) => (
            <div
              key={material.slug}
              className="overflow-hidden rounded-lg border border-border-subtle bg-surface-raised shadow-elevation-sm"
            >
              <div className={cn("h-40 w-full", material.swatchClassName)} />
              <div className="p-6">
                <h3 className="font-display text-lg font-medium text-text-primary">{material.name}</h3>
                <p className="mt-1 text-xs font-medium uppercase tracking-wider text-text-accent">
                  {material.tagline}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-text-muted">{material.description}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {material.bestFor.map((use) => (
                    <Badge key={use} variant="outline">{use}</Badge>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border-subtle bg-surface-sunken">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-24">
          <Kicker>Finitions</Kicker>
          <h2 className="mt-5 max-w-xl font-display text-3xl font-medium leading-[1.15] text-text-primary sm:text-4xl">
            Le rendu final, à votre goût
          </h2>
          <p className="mt-5 max-w-lg text-[0.9375rem] leading-relaxed text-text-secondary">
            Chaque matériau peut recevoir plusieurs traitements de finition,
            pour ajuster le rendu final à l&rsquo;ambiance recherchée.
          </p>

          <div className="mt-12 grid gap-px overflow-hidden rounded-lg border border-border-subtle bg-border-subtle sm:grid-cols-2 lg:grid-cols-3">
            {FINISHES.map((finish) => (
              <div key={finish.slug} className="flex flex-col gap-2 bg-surface-raised p-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-text-primary">
                  {finish.name}
                </h3>
                <p className="text-sm leading-relaxed text-text-muted">{finish.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-grain bg-grain-dark relative overflow-hidden bg-ink-950">
        <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-6 py-16 lg:flex-row lg:items-center lg:px-10">
          <div>
            <Kicker>Toucher la matière</Kicker>
            <h2 className="mt-4 font-display text-3xl font-medium text-text-inverse sm:text-4xl">
              Venez voir nos échantillons en atelier
            </h2>
            <p className="mt-3 max-w-md text-sm text-text-inverse-muted">
              Rien ne remplace le contact direct avec la matière — réservez une
              visite pour composer votre palette.
            </p>
          </div>
          <Button variant="gold" size="lg" asChild>
            <Link href="/consultation">Réserver une visite →</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
