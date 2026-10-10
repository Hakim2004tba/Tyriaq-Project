import Link from "next/link";
import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ArchitecturalPanel } from "@/components/marketing/architectural-panel";
import type { PortfolioProjectRecord } from "@/lib/data/operations";

/** Deterministic fallback decoration for a project with no uploaded photos yet. */
function fallbackVariant(slug: string): 1 | 2 | 3 | 4 | 5 | 6 {
  let hash = 0;
  for (const char of slug) hash = (hash * 31 + char.charCodeAt(0)) % 6;
  return ((hash % 6) + 1) as 1 | 2 | 3 | 4 | 5 | 6;
}

function PortfolioProjectCard({ project }: { project: PortfolioProjectRecord }) {
  const cover = project.images[0];

  return (
    <Link
      href={`/realisations/${project.slug}`}
      className="focus-ring group block overflow-hidden rounded-lg border border-border-subtle bg-surface-raised shadow-elevation-sm transition-shadow duration-300 hover:shadow-elevation-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover.dataUrl}
            alt={project.title}
            className="h-full w-full object-cover transition-transform duration-700 ease-[var(--ease-editorial)] group-hover:scale-[1.06]"
          />
        ) : (
          <ArchitecturalPanel
            variant={fallbackVariant(project.slug)}
            className="transition-transform duration-700 ease-[var(--ease-editorial)] group-hover:scale-[1.06]"
          />
        )}
        <Badge variant="gold" className="absolute left-3 top-3">
          {project.category}
        </Badge>
      </div>
      <div className="p-5">
        <h3 className="font-display text-lg font-medium text-text-primary">{project.title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-text-muted">{project.summary}</p>
        <div className="mt-4 flex items-center justify-between text-xs text-text-muted">
          <span className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" /> {project.location}
          </span>
          <span>{project.layout}</span>
        </div>
      </div>
    </Link>
  );
}

export { PortfolioProjectCard, fallbackVariant };
