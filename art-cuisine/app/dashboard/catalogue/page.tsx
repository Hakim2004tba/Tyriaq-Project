import { Receipt, Layers, Tags, TrendingUp, Plus, Pencil } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { CatalogueFilters } from "@/components/dashboard/catalogue/catalogue-filters";
import { CatalogueItemDialog } from "@/components/dashboard/catalogue/catalogue-item-dialog";
import { PriceHistoryDialog } from "@/components/dashboard/catalogue/price-history-dialog";
import { ToggleActiveButton } from "@/components/dashboard/catalogue/toggle-active-button";
import { filterCatalogue, getCatalogueListStats, getPriceHistoryForItem } from "@/lib/data/pricing";
import { formatCurrencyDA } from "@/lib/format";
import type { CatalogueCategory, CatalogueAvailability } from "@/lib/data/operations";

const AVAILABILITY_BADGE: Record<CatalogueAvailability, "success" | "info" | "danger"> = {
  "En stock": "success",
  "Sur commande": "info",
  "Rupture de stock": "danger",
};

export default async function CataloguePage({ searchParams }: PageProps<"/dashboard/catalogue">) {
  await requirePermission("catalogue.manage");

  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q : "";
  const category = typeof params.categorie === "string" ? params.categorie : "toutes";
  const availability = typeof params.disponibilite === "string" ? params.disponibilite : "toutes";
  const status = typeof params.statut === "string" ? params.statut : "tous";

  const stats = getCatalogueListStats();
  const items = filterCatalogue({
    search,
    category: category as CatalogueCategory | "toutes",
    availability: availability as CatalogueAvailability | "toutes",
    status: status as "actifs" | "inactifs" | "tous",
  });

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-medium text-text-primary sm:text-3xl">Catalogue tarifs</h1>
          <p className="mt-1 text-sm text-text-muted">
            Caissons, façades, plans de travail, quincaillerie, accessoires, électroménager, matériaux, finitions, vernissage, montage et transport.
          </p>
        </div>
        <CatalogueItemDialog
          trigger={
            <Button>
              <Plus className="h-4 w-4" /> Nouvel article
            </Button>
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Articles" value={String(stats.total)} icon={Receipt} helperText={`${stats.active} actifs`} />
        <StatCard label="Catégories" value={String(stats.categories)} icon={Layers} helperText="couvertes par le catalogue" />
        <StatCard label="Prix moyen" value={formatCurrencyDA(stats.averagePrice)} icon={TrendingUp} helperText="articles actifs" />
        <StatCard label="Inactifs" value={String(stats.total - stats.active)} icon={Tags} helperText="masqués des nouveaux devis" />
      </div>

      <CatalogueFilters search={search} category={category} availability={availability} status={status} />

      <Card className="overflow-hidden">
        <Table className="border-none">
          <TableHeader>
            <TableRow>
              <TableHead>Article</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Unité</TableHead>
              <TableHead className="text-right">Prix unitaire</TableHead>
              <TableHead>Disponibilité</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-sm text-text-muted">
                  Aucun article ne correspond à ces critères.
                </TableCell>
              </TableRow>
            )}
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <p className="font-medium text-text-primary">{item.name}</p>
                  {item.description && <p className="text-xs text-text-muted">{item.description}</p>}
                </TableCell>
                <TableCell className="font-mono text-xs text-text-secondary">{item.sku}</TableCell>
                <TableCell className="text-text-secondary">{item.category}</TableCell>
                <TableCell className="text-text-secondary">{item.unit}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrencyDA(item.unitPrice)}</TableCell>
                <TableCell>
                  <Badge variant={AVAILABILITY_BADGE[item.availability]}>{item.availability}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={item.active ? "success" : "neutral"}>{item.active ? "Actif" : "Inactif"}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <PriceHistoryDialog itemName={item.name} history={getPriceHistoryForItem(item.id)} />
                    <CatalogueItemDialog
                      item={item}
                      trigger={
                        <Button type="button" variant="ghost" size="icon" title="Modifier">
                          <Pencil className="h-3.5 w-3.5 text-text-muted" />
                        </Button>
                      }
                    />
                    <ToggleActiveButton itemId={item.id} active={item.active} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
