import type { Metadata } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { PageHero } from "@/components/marketing/page-hero";
import { PortfolioProjectCard } from "@/components/marketing/portfolio-project-card";
import { PORTFOLIO_CATEGORIES, getPublishedPortfolioProjects } from "@/lib/data/portfolio";

export const metadata: Metadata = {
  title: "Nos réalisations — ART Cuisine",
  description: "Le portfolio complet des cuisines sur mesure réalisées par ART Cuisine.",
};

export default async function RealisationsPage({
  searchParams,
}: PageProps<"/realisations">) {
  const params = await searchParams;
  const styleParam = Array.isArray(params.style) ? params.style[0] : params.style;
  const activeStyle = PORTFOLIO_CATEGORIES.find((c) => c === styleParam);

  const allProjects = getPublishedPortfolioProjects();
  const projects = activeStyle
    ? allProjects.filter((p) => p.category === activeStyle)
    : allProjects;

  return (
    <>
      <PageHero
        kicker="Nos réalisations"
        title="Des projets qui inspirent"
        description="Chaque cuisine est une histoire, un style, une émotion. Parcourez nos réalisations et la diversité de nos créations sur mesure."
        breadcrumb={[{ label: "Nos réalisations" }]}
      />

      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/realisations"
            className={cn(
              "rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors",
              !activeStyle
                ? "border-ink-950 bg-ink-950 text-white"
                : "border-border-default text-text-secondary hover:border-ink-950 hover:text-text-primary",
            )}
          >
            Tous les projets
          </Link>
          {PORTFOLIO_CATEGORIES.map((category) => (
            <Link
              key={category}
              href={{ pathname: "/realisations", query: { style: category } }}
              className={cn(
                "rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors",
                activeStyle === category
                  ? "border-ink-950 bg-ink-950 text-white"
                  : "border-border-default text-text-secondary hover:border-ink-950 hover:text-text-primary",
              )}
            >
              {category}
            </Link>
          ))}
        </div>

        <p className="mt-6 text-sm text-text-muted">
          {projects.length} projet{projects.length > 1 ? "s" : ""}
          {activeStyle ? ` — style ${activeStyle.toLowerCase()}` : ""}
        </p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <PortfolioProjectCard key={project.slug} project={project} />
          ))}
        </div>
      </section>
    </>
  );
}
