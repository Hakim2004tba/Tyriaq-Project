import type { Metadata } from "next";
import { CircleCheck } from "lucide-react";
import { PageHero } from "@/components/marketing/page-hero";
import { KitchenConfigurator } from "@/components/marketing/configurator/kitchen-configurator";
import { getProjectBySlug } from "@/lib/data/projects";

export const metadata: Metadata = {
  title: "Configurateur de cuisine — ART Cuisine",
  description: "Configurez votre cuisine sur mesure étape par étape et recevez un devis gratuit et sans engagement.",
};

const REASSURANCE = [
  "Étude et devis 100% gratuits",
  "Réponse sous 24 à 48h ouvrées",
  "Aucun engagement de votre part",
  "Fabrication 100% en atelier",
];

export default async function DevisPage({ searchParams }: PageProps<"/devis">) {
  const params = await searchParams;
  const projetParam = Array.isArray(params.projet) ? params.projet[0] : params.projet;
  const project = projetParam ? getProjectBySlug(projetParam) : undefined;

  return (
    <>
      <PageHero
        kicker="Configurateur de cuisine"
        title="Composez votre cuisine sur mesure"
        description="Agencement, équipements, accessoires, budget et espace — configurez votre projet étape par étape, notre équipe commerciale revient vers vous avec un premier chiffrage."
        breadcrumb={[{ label: "Demander un devis" }]}
      />

      <section className="mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-24">
        <div className="grid gap-14 lg:grid-cols-[0.8fr_2fr] lg:gap-16">
          <div>
            <h2 className="font-display text-2xl font-medium text-text-primary sm:text-3xl">
              Ce qui vous est garanti
            </h2>
            <ul className="mt-6 flex flex-col gap-4">
              {REASSURANCE.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-text-secondary">
                  <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent-strong" />
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-10 rounded-md border border-border-subtle bg-surface-sunken px-5 py-4">
              <p className="text-xs leading-relaxed text-text-muted">
                Besoin d&rsquo;échanger d&rsquo;abord de vive voix ? Réservez
                plutôt une{" "}
                <a href="/consultation" className="font-medium text-text-accent hover:opacity-70">
                  consultation gratuite
                </a>{" "}
                avec l&rsquo;un de nos designers.
              </p>
            </div>
          </div>

          <KitchenConfigurator referenceLabel={project?.category ? `${project.category} — ${project.title}` : undefined} />
        </div>
      </section>
    </>
  );
}
