import Link from "next/link";
import { Image as ImageIcon, Star, Eye, Archive } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import type { Role } from "@/lib/auth/roles";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { PortfolioFilters } from "@/components/dashboard/portfolio/portfolio-filters";
import { PortfolioFormDialog } from "@/components/dashboard/portfolio/portfolio-form-dialog";
import { PortfolioStatusSelect } from "@/components/dashboard/portfolio/portfolio-status-select";
import { FeatureToggleButton } from "@/components/dashboard/portfolio/feature-toggle-button";
import { ReorderButtons } from "@/components/dashboard/portfolio/reorder-buttons";
import { ArchiveToggleButton } from "@/components/dashboard/portfolio/archive-toggle-button";
import { filterPortfolio, getPortfolioListStats, type PortfolioFilters as PortfolioFiltersType } from "@/lib/data/portfolio";
import { PROJECTS } from "@/lib/data/operations";
import type { PortfolioStatus } from "@/lib/data/operations";

const STATUS_BADGE: Record<PortfolioStatus, "neutral" | "success" | "warning"> = {
  Brouillon: "neutral",
  Publié: "success",
  Archivé: "warning",
};

export default async function PortefeuillePage({ searchParams }: PageProps<"/dashboard/portefeuille">) {
  const user = await requirePermission("portefeuille.view");
  const canManage = hasPermission(user.role as Role, "portefeuille.manage");

  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q : "";
  const category = typeof params.categorie === "string" ? params.categorie : "toutes";
  const status = typeof params.statut === "string" ? params.statut : "tous";

  const stats = getPortfolioListStats();
  const items = filterPortfolio({
    search,
    category: category as PortfolioFiltersType["category"],
    status: status as PortfolioFiltersType["status"],
  });

  const candidateProjects = PROJECTS.filter((p) => p.stage === "Terminé").map((p) => ({
    ref: p.ref,
    label: `${p.ref} — ${p.name}`,
  }));

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-medium text-text-primary sm:text-3xl">Portefeuille</h1>
          <p className="mt-1 text-sm text-text-muted">
            La galerie des réalisations publiées sur le site public ART Cuisine.
          </p>
        </div>
        {canManage && <PortfolioFormDialog candidateProjects={candidateProjects} />}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Réalisations" value={String(stats.total)} icon={ImageIcon} helperText="toutes" />
        <StatCard label="Publiées" value={String(stats.published)} icon={Eye} helperText="visibles sur /realisations" />
        <StatCard label="Brouillons" value={String(stats.draft)} icon={ImageIcon} helperText="non publiées" />
        <StatCard label="À la une" value={String(stats.featured)} icon={Star} helperText="mises en avant" />
        <StatCard label="Archivées" value={String(stats.archived)} icon={Archive} helperText="masquées" />
      </div>

      <PortfolioFilters search={search} category={category} status={status} />

      <Card className="overflow-hidden">
        <Table className="border-none">
          <TableHeader>
            <TableRow>
              {canManage && <TableHead className="w-10" />}
              <TableHead>Réalisation</TableHead>
              <TableHead>Style</TableHead>
              <TableHead>Images</TableHead>
              <TableHead>Statut</TableHead>
              {canManage && <TableHead className="w-28" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={canManage ? 6 : 5} className="py-10 text-center text-sm text-text-muted">
                  Aucune réalisation ne correspond à ces critères.
                </TableCell>
              </TableRow>
            )}
            {items.map((item, i) => (
              <TableRow key={item.id}>
                {canManage && (
                  <TableCell>
                    <ReorderButtons id={item.id} isFirst={i === 0} isLast={i === items.length - 1} />
                  </TableCell>
                )}
                <TableCell>
                  <Link href={`/dashboard/portefeuille/${item.id}`} className="flex items-center gap-3 hover:opacity-80">
                    <div className="h-10 w-14 shrink-0 overflow-hidden rounded-md border border-border-subtle bg-surface-sunken">
                      {item.images[0] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.images[0].dataUrl} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div>
                      <p className="flex items-center gap-1.5 font-medium text-text-primary">
                        {item.featured && <Star className="h-3 w-3 fill-gold-400 text-gold-400" />}
                        {item.title}
                      </p>
                      <p className="text-xs text-text-muted">{item.location} · {item.year}</p>
                    </div>
                  </Link>
                </TableCell>
                <TableCell className="text-text-secondary">{item.category}</TableCell>
                <TableCell className="text-text-secondary">{item.images.length}</TableCell>
                <TableCell>
                  {canManage ? (
                    <PortfolioStatusSelect id={item.id} status={item.status} />
                  ) : (
                    <Badge variant={STATUS_BADGE[item.status]}>{item.status}</Badge>
                  )}
                </TableCell>
                {canManage && (
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <FeatureToggleButton id={item.id} featured={item.featured} />
                      <ArchiveToggleButton id={item.id} archived={item.status === "Archivé"} />
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
