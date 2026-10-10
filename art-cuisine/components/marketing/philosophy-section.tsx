import { Kicker } from "@/components/ui/section-heading";

function PhilosophySection() {
  return (
    <section id="philosophie" className="bg-surface">
      <div className="mx-auto max-w-4xl px-6 py-20 text-center lg:py-28">
        <div className="flex justify-center">
          <Kicker>Notre philosophie</Kicker>
        </div>
        <p className="mx-auto mt-8 max-w-3xl font-display text-3xl italic leading-[1.35] text-text-primary sm:text-4xl">
          Une cuisine sur mesure n&rsquo;est pas un meuble que l&rsquo;on
          choisit — c&rsquo;est un espace de vie que l&rsquo;on dessine
          ensemble, où chaque détail a une raison d&rsquo;être.
        </p>
        <div className="mx-auto mt-8 h-px w-16 bg-accent" />
        <p className="mx-auto mt-8 max-w-xl text-sm leading-relaxed text-text-secondary">
          Nous refusons les catalogues et les compromis. Chaque cuisine ART
          Cuisine naît d&rsquo;un dialogue entre votre quotidien et notre
          exigence artisanale — pour un résultat qui ne se démode pas.
        </p>
      </div>
    </section>
  );
}

export { PhilosophySection };
