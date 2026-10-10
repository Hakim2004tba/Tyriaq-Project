import Link from "next/link";
import { Kicker } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";

function DevisCta() {
  return (
    <section id="devis" className="bg-grain bg-grain-dark relative overflow-hidden bg-ink-950">
      <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-6 py-16 lg:flex-row lg:items-center lg:px-10">
        <div>
          <Kicker>Votre projet</Kicker>
          <h2 className="mt-4 font-display text-3xl font-medium text-text-inverse sm:text-4xl">
            Parlons de votre cuisine
          </h2>
          <p className="mt-3 max-w-md text-sm text-text-inverse-muted">
            Notre équipe est à votre écoute pour concrétiser votre projet.
          </p>
        </div>
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <Button variant="gold" size="lg" asChild>
            <Link href="/devis">Demander un devis →</Link>
          </Button>
          <span className="text-xs uppercase tracking-wider text-text-inverse-muted">
            Étude gratuite &amp; sans engagement
          </span>
        </div>
      </div>
    </section>
  );
}

export { DevisCta };
