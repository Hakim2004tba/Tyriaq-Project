import Link from "next/link";
import { Kicker } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";

const QUICK_FACTS = [
  { value: "15 ans", label: "D'expertise artisanale" },
  { value: "500+", label: "Cuisines livrées" },
  { value: "100%", label: "Fabrication sur mesure" },
];

function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[560px] bg-[radial-gradient(60%_50%_at_80%_0%,var(--stone-150)_0%,transparent_70%)]" />

      <div className="mx-auto max-w-7xl px-6 pb-16 pt-14 lg:px-10 lg:pt-20">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div>
            <Kicker>Cuisines sur mesure</Kicker>
            <h1 className="mt-6 font-display text-5xl font-medium leading-[1.05] text-text-primary sm:text-6xl">
              L&rsquo;art de votre
              <br />
              cuisine
              <br />
              <span className="italic text-text-accent">sur-mesure</span>
            </h1>
            <p className="mt-6 max-w-md text-[0.9375rem] leading-relaxed text-text-secondary">
              Des cuisines pensées pour votre espace, votre style et votre
              quotidien. Un design unique, une fabrication d&rsquo;exception,
              une équipe à vos côtés.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Button variant="primary" size="lg" asChild>
                <Link href="#realisations">Découvrir nos cuisines →</Link>
              </Button>
              <Button variant="ghost" size="lg" asChild>
                <Link href="#devis">Demander un devis</Link>
              </Button>
            </div>

            <dl className="mt-14 grid max-w-md grid-cols-3 gap-6 border-t border-border-subtle pt-8">
              {QUICK_FACTS.map((f) => (
                <div key={f.label}>
                  <dt className="font-display text-2xl text-text-primary">{f.value}</dt>
                  <dd className="mt-1 text-xs leading-snug text-text-muted">{f.label}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative aspect-[4/3.1] overflow-hidden rounded-lg border border-border-subtle bg-surface-sunken shadow-elevation-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/kitchens/hero.png" alt="Cuisine sur mesure ART Cuisine" className="h-full w-full object-cover" />
            <div className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-inset ring-black/5" />
            <div className="absolute -bottom-5 -left-5 hidden h-24 w-24 rotate-6 rounded-md border border-gold-400/30 bg-surface-raised/80 shadow-elevation-md backdrop-blur sm:block" />
          </div>
        </div>
      </div>
    </section>
  );
}

export { HeroSection };
