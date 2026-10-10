import {
  PORTFOLIO_PROJECTS,
  PORTFOLIO_CATEGORIES,
  PORTFOLIO_STATUSES,
  type PortfolioProjectRecord,
  type PortfolioCategory,
  type PortfolioStatus,
} from "@/lib/data/operations";

export { PORTFOLIO_CATEGORIES, PORTFOLIO_STATUSES };

export interface PortfolioFilters {
  search?: string;
  category?: PortfolioCategory | "toutes";
  status?: PortfolioStatus | "tous";
}

/** Admin listing — every status, most recently updated first unless filtered. */
export function filterPortfolio(filters: PortfolioFilters): PortfolioProjectRecord[] {
  const search = filters.search?.trim().toLowerCase();

  return PORTFOLIO_PROJECTS.filter((p) => {
    if (search) {
      const haystack = `${p.title} ${p.location} ${p.layout} ${p.summary}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    if (filters.category && filters.category !== "toutes" && p.category !== filters.category) return false;
    if (filters.status && filters.status !== "tous" && p.status !== filters.status) return false;
    return true;
  }).sort((a, b) => a.order - b.order);
}

export function getPortfolioProjectById(id: string): PortfolioProjectRecord | undefined {
  return PORTFOLIO_PROJECTS.find((p) => p.id === id);
}

export function getPortfolioProjectBySlug(slug: string): PortfolioProjectRecord | undefined {
  return PORTFOLIO_PROJECTS.find((p) => p.slug === slug);
}

/** The public /realisations listing — published only, in admin-chosen order. */
export function getPublishedPortfolioProjects(): PortfolioProjectRecord[] {
  return PORTFOLIO_PROJECTS.filter((p) => p.status === "Publié").sort((a, b) => a.order - b.order);
}

export function getFeaturedPortfolioProjects(count = 4): PortfolioProjectRecord[] {
  return getPublishedPortfolioProjects().filter((p) => p.featured).slice(0, count);
}

export function getRelatedPortfolioProjects(project: PortfolioProjectRecord, count = 3): PortfolioProjectRecord[] {
  const published = getPublishedPortfolioProjects().filter((p) => p.id !== project.id);
  const sameCategory = published.filter((p) => p.category === project.category);
  const others = published.filter((p) => p.category !== project.category);
  return [...sameCategory, ...others].slice(0, count);
}

export function isSlugTaken(slug: string, excludeId?: string): boolean {
  return PORTFOLIO_PROJECTS.some((p) => p.slug === slug && p.id !== excludeId);
}

export interface PortfolioListStats {
  total: number;
  published: number;
  draft: number;
  archived: number;
  featured: number;
}

export function getPortfolioListStats(): PortfolioListStats {
  return {
    total: PORTFOLIO_PROJECTS.length,
    published: PORTFOLIO_PROJECTS.filter((p) => p.status === "Publié").length,
    draft: PORTFOLIO_PROJECTS.filter((p) => p.status === "Brouillon").length,
    archived: PORTFOLIO_PROJECTS.filter((p) => p.status === "Archivé").length,
    featured: PORTFOLIO_PROJECTS.filter((p) => p.featured).length,
  };
}
