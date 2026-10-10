import type { Metadata } from "next";
import Link from "next/link";
import { Gem, Handshake, Leaf, MapPinned } from "lucide-react";
import { PageHero } from "@/components/marketing/page-hero";
import { Kicker } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "À propos — ART Cuisine",
  description: "L'histoire, les valeurs et le savoir-faire de l'atelier ART Cuisine.",
};

const VALUES = [
  {
    icon: Gem,
    title: "Exigence",
    description: "Aucune cuisine ne quitte l'atelier sans un contrôle qualité intégral.",
  },
  {
    icon: Handshake,
    title: "Transparence",
    description: "Un devis clair, un interlocuteur unique, aucune surprise en cours de projet.",
  },
  {
    icon: Leaf,
    title: "Durabilité",
    description: "Des matériaux choisis pour traverser les générations, pas les tendances.",
  },
  {
    icon: MapPinned,
    title: "Proximité",
    description: "Une équipe locale, de la conception à l'intervention SAV.",
  },
];

const MILESTONES = [
  { year: "2011", title: "Ouverture de l'atelier", description: "Premiers pas à Alger, avec une équipe de trois artisans menuisiers." },
  { year: "2015", title: "Atelier de menuiserie agrandi", description: "Intégration d'un parc machine à commande numérique pour la précision des découpes." },
  { year: "2019", title: "Atelier de taille de pierre", description: "Internalisation complète du travail du marbre et de la pierre naturelle." },
  { year: "2025", title: "500ᵉ cuisine livrée", description: "Une équipe de 40 personnes et un savoir-faire reconnu dans tout le pays." },
];

const STATS = [
  { value: "15", suffix: "ans", label: "D'expérience artisanale" },
  { value: "500", suffix: "+", label: "Cuisines livrées" },
  { value: "40", suffix: "", label: "Artisans et collaborateurs" },
  { value: "96", suffix: "%", label: "Clients satisfaits" },
];

export default function AProposPage() {
  return (
    <>
      <PageHero
        kicker="À propos"
        title="L'art de la cuisine, depuis notre atelier"
        description="ART Cuisine est née d'une conviction simple : une cuisine sur mesure doit être pensée, dessinée et fabriquée par les mêmes mains, du premier trait au dernier réglage."
        breadcrumb={[{ label: "À propos" }]}
      />

      <section className="mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-28">
        <div className="grid gap-14 lg:grid-cols-2 lg:gap-20">
          <div>
            <Kicker>Notre histoire</Kicker>
            <h2 className="mt-5 font-display text-3xl font-medium leading-[1.15] text-text-primary sm:text-4xl">
              D&rsquo;un petit atelier de menuiserie à une maison de cuisines sur mesure
            </h2>
            <p className="mt-6 text-[0.9375rem] leading-relaxed text-text-secondary">
              Tout a commencé avec trois artisans menuisiers et une conviction :
              les cuisines vendues en série ne répondaient ni à l&rsquo;architecture
              de nos intérieurs, ni à la façon dont on y vit réellement.
            </p>
            <p className="mt-4 text-[0.9375rem] leading-relaxed text-text-secondary">
              Quinze ans plus tard, ART Cuisine réunit sous un même toit la
              conception, la menuiserie, la taille de pierre, le vernissage et
              la pose — pour garder la main sur chaque détail, du plan initial
              à la crémaillère du dernier tiroir.
            </p>

            <ol className="mt-10 flex flex-col gap-6 border-l border-border-subtle pl-6">
              {MILESTONES.map((m) => (
                <li key={m.year} className="relative">
                  <span
                    aria-hidden
                    className="absolute -left-[1.625rem] top-1.5 h-2.5 w-2.5 rounded-full bg-accent"
                  />
                  <span className="font-display text-sm text-text-accent">{m.year}</span>
                  <h3 className="mt-1 text-sm font-semibold uppercase tracking-wider text-text-primary">
                    {m.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-text-muted">{m.description}</p>
                </li>
              ))}
            </ol>
          </div>

          <div className="relative aspect-[4/3.6] overflow-hidden rounded-lg border border-border-subtle shadow-elevation-md lg:aspect-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/company/atelier.webp" alt="Atelier ART Cuisine" className="h-full w-full object-cover" />
          </div>
        </div>
      </section>

      <section className="border-y border-border-subtle bg-surface-raised">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-28">
          <Kicker>Nos valeurs</Kicker>
          <h2 className="mt-5 max-w-xl font-display text-3xl font-medium leading-[1.15] text-text-primary sm:text-4xl">
            Ce qui guide chacun de nos projets
          </h2>

          <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex flex-col items-start gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-full border border-border-default text-accent-strong">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-text-primary">
                    {title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-text-muted">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-28">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border-subtle bg-border-subtle lg:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="bg-surface-raised px-6 py-8">
              <p className="font-display text-4xl text-text-primary">
                {s.value}
                <span className="text-text-accent">{s.suffix}</span>
              </p>
              <p className="mt-2 text-xs leading-snug text-text-muted">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-grain bg-grain-dark relative overflow-hidden bg-ink-950">
        <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-6 py-16 lg:flex-row lg:items-center lg:px-10">
          <div>
            <Kicker>Rencontrons-nous</Kicker>
            <h2 className="mt-4 font-display text-3xl font-medium text-text-inverse sm:text-4xl">
              Venez découvrir notre atelier
            </h2>
            <p className="mt-3 max-w-md text-sm text-text-inverse-muted">
              Visite d&rsquo;atelier, échange avec nos designers, présentation des
              matériaux — sur rendez-vous, sans engagement.
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
