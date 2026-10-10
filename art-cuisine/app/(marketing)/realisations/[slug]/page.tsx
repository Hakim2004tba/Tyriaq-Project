import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, MapPin, Ruler, LayoutGrid, ArrowUpRight } from "lucide-react";
import { ArchitecturalPanel } from "@/components/marketing/architectural-panel";
import { PortfolioProjectCard, fallbackVariant } from "@/components/marketing/portfolio-project-card";
import { Kicker } from "@/components/ui/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  getPublishedPortfolioProjects,
  getPortfolioProjectBySlug,
  getRelatedPortfolioProjects,
} from "@/lib/data/portfolio";

export function generateStaticParams() {
  return getPublishedPortfolioProjects().map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/realisations/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const project = getPortfolioProjectBySlug(slug);
  if (!project || project.status !== "Publié") return { title: "Réalisation — ART Cuisine" };
  return {
    title: `${project.title} — ART Cuisine`,
    description: project.summary,
  };
}

export default async function ProjectPage({ params }: PageProps<"/realisations/[slug]">) {
  const { slug } = await params;
  const project = getPortfolioProjectBySlug(slug);
  if (!project || project.status !== "Publié") notFound();

  const related = getRelatedPortfolioProjects(project);
  const gallery = project.images.length > 0 ? project.images : null;

  return (
    <>
      <section className="border-b border-border-subtle">
        <div className="mx-auto max-w-7xl px-6 pb-14 pt-10 lg:px-10 lg:pt-14">
          <nav className="mb-8 flex items-center gap-1.5 text-xs text-text-muted" aria-label="Fil d'Ariane">
            <Link href="/" className="transition-colors hover:text-text-primary">Accueil</Link>
            <span>/</span>
            <Link href="/realisations" className="transition-colors hover:text-text-primary">Nos réalisations</Link>
            <span>/</span>
            <span className="text-text-secondary">{project.title}</span>
          </nav>

          <Kicker>{project.category}</Kicker>
          <h1 className="mt-5 font-display text-4xl font-medium leading-[1.1] text-text-primary sm:text-5xl">
            {project.title}
          </h1>
          <p className="mt-5 max-w-xl text-[0.9375rem] leading-relaxed text-text-secondary">
            {project.summary}
          </p>

          <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <MapPin className="h-4 w-4 text-text-muted" /> {project.location}
            </div>
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <Calendar className="h-4 w-4 text-text-muted" /> {project.year}
            </div>
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <Ruler className="h-4 w-4 text-text-muted" /> {project.surface}
            </div>
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <LayoutGrid className="h-4 w-4 text-text-muted" /> {project.layout}
            </div>
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14 lg:px-10">
        {gallery ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-border-subtle sm:row-span-2 sm:aspect-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={gallery[0].dataUrl} alt={project.title} className="h-full w-full object-cover" />
            </div>
            {gallery.slice(1).map((image) => (
              <div key={image.id} className="relative aspect-[4/3] overflow-hidden rounded-lg border border-border-subtle">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.dataUrl} alt={project.title} className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        ) : (
          <div className="relative aspect-[16/9] overflow-hidden rounded-lg border border-border-subtle">
            <ArchitecturalPanel variant={fallbackVariant(project.slug)} />
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14 lg:px-10">
        <div className="grid gap-14 lg:grid-cols-[1.5fr_1fr] lg:gap-20">
          <div>
            <Kicker>Le projet</Kicker>
            <h2 className="mt-5 font-display text-2xl font-medium text-text-primary sm:text-3xl">
              La démarche
            </h2>
            <div className="mt-6 flex flex-col gap-4">
              {project.description.map((paragraph, i) => (
                <p key={i} className="text-[0.9375rem] leading-relaxed text-text-secondary">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-8">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Matériaux utilisés
              </h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {project.materials.map((m) => (
                  <Badge key={m} variant="outline">{m}</Badge>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Finitions
              </h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {project.finishes.map((f) => (
                  <Badge key={f} variant="gold">{f}</Badge>
                ))}
              </div>
            </div>
            <Separator />
            <div>
              <p className="text-sm leading-relaxed text-text-secondary">
                Un projet similaire en tête ? Parlons-en et donnons-lui la
                forme de votre propre cuisine.
              </p>
              <Button className="mt-4 w-full" asChild>
                <Link href={{ pathname: "/devis", query: { projet: project.slug } }}>
                  Demander un devis pour ce style →
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="border-t border-border-subtle bg-surface-sunken">
          <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl font-medium text-text-primary sm:text-3xl">
                Projets similaires
              </h2>
              <Link
                href="/realisations"
                className="hidden items-center gap-1.5 text-sm font-semibold text-text-accent hover:opacity-70 sm:flex"
              >
                Tout voir <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <PortfolioProjectCard key={p.slug} project={p} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
