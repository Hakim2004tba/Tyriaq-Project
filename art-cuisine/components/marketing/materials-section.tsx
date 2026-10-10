import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Kicker } from "@/components/ui/section-heading";
import { MaterialSwatches } from "@/components/marketing/material-swatches";

const MATERIALS = [
  "Bois massif",
  "Pierre naturelle",
  "Mélamine",
  "Métal",
  "Marbre",
];

function MaterialsSection() {
  return (
    <section id="materiaux" className="bg-surface">
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-28">
        <div className="grid gap-16 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-20">
          <div className="order-2 flex items-center justify-center lg:order-1">
            <MaterialSwatches className="max-w-sm" />
          </div>

          <div className="order-1 lg:order-2">
            <Kicker>Nos matériaux</Kicker>
            <h2 className="mt-5 font-display text-3xl font-medium leading-[1.15] text-text-primary sm:text-4xl">
              Des matériaux d&rsquo;exception
            </h2>
            <p className="mt-5 max-w-md text-[0.9375rem] leading-relaxed text-text-secondary">
              Nous sélectionnons les meilleurs matériaux pour créer des
              cuisines durables, esthétiques et fonctionnelles — choisis pour
              leur tenue dans le temps autant que pour leur caractère.
            </p>

            <ul className="mt-9 flex flex-col gap-1">
              {MATERIALS.map((m) => (
                <li key={m}>
                  <span className="flex items-center gap-3 border-b border-border-subtle py-3 text-sm font-medium uppercase tracking-wider text-text-primary">
                    <span className="h-px w-5 bg-accent" />
                    {m}
                  </span>
                </li>
              ))}
            </ul>

            <Link
              href="/nos-materiaux"
              className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-text-accent transition-opacity hover:opacity-70"
            >
              Découvrir nos matériaux <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export { MaterialsSection };
