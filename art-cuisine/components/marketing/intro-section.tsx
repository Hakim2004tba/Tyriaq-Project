import { Kicker } from "@/components/ui/section-heading";

const PILLARS = [
  {
    n: "01",
    title: "Écoute",
    description: "Chaque projet commence par votre espace, vos usages et vos envies.",
  },
  {
    n: "02",
    title: "Précision",
    description: "Un tracé millimétré, des matériaux choisis, une exécution sans compromis.",
  },
  {
    n: "03",
    title: "Transmission",
    description: "Un savoir-faire d'atelier, pensé pour traverser les générations.",
  },
];

function IntroSection() {
  return (
    <section id="introduction" className="border-t border-border-subtle bg-surface-raised">
      <div className="mx-auto grid max-w-7xl gap-14 px-6 py-20 lg:grid-cols-[1fr_1fr] lg:gap-20 lg:px-10 lg:py-28">
        <div>
          <Kicker>ART Cuisine</Kicker>
          <h2 className="mt-5 font-display text-3xl font-medium leading-[1.15] text-text-primary sm:text-4xl">
            Une maison dédiée à l&rsquo;art de la cuisine sur mesure
          </h2>
          <p className="mt-6 max-w-lg text-[0.9375rem] leading-relaxed text-text-secondary">
            Depuis notre atelier, nous concevons et fabriquons des cuisines qui
            ne ressemblent à aucune autre — pensées pièce par pièce pour
            l&rsquo;architecture de votre intérieur, la lumière de votre pièce
            et la manière dont vous vivez chez vous. Rien n&rsquo;est
            standard ; tout est dessiné, taillé et assemblé pour vous.
          </p>

          <dl className="mt-12 grid gap-8 sm:grid-cols-3">
            {PILLARS.map((p) => (
              <div key={p.n}>
                <span className="font-display text-sm text-text-accent">{p.n}</span>
                <dt className="mt-2 text-sm font-semibold uppercase tracking-wider text-text-primary">
                  {p.title}
                </dt>
                <dd className="mt-2 text-sm leading-relaxed text-text-muted">
                  {p.description}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative aspect-[4/3.4] overflow-hidden rounded-lg border border-border-subtle shadow-elevation-md lg:aspect-auto">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/kitchens/intro.png" alt="Atelier ART Cuisine" className="h-full w-full object-cover" />
        </div>
      </div>
    </section>
  );
}

export { IntroSection };
