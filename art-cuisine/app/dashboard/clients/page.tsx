import Link from "next/link";
import { Users, UserCheck, Star, UserX, Plus, ChevronRight } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { getOwnerScope } from "@/lib/data/scope";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { ClientFilters } from "@/components/dashboard/clients/client-filters";
import { ClientFormDialog } from "@/components/dashboard/clients/client-form-dialog";
import {
  filterClients,
  getClientListStats,
  getClientFinancials,
  getCities,
  CLIENT_STATUSES,
} from "@/lib/data/clients";
import { formatCurrencyDA, formatShortDate } from "@/lib/format";
import type { ClientStatus } from "@/lib/data/operations";

const STATUS_VARIANT: Record<ClientStatus, "success" | "gold" | "neutral" | "outline"> = {
  Actif: "success",
  VIP: "gold",
  Inactif: "neutral",
  Archivé: "outline",
};

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export default async function ClientsPage({ searchParams }: PageProps<"/dashboard/clients">) {
  const user = await requirePermission("clients.manage");
  const scope = getOwnerScope(user);

  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q : "";
  const status = typeof params.statut === "string" ? params.statut : "tous";
  const commercial = scope ?? (typeof params.commercial === "string" ? params.commercial : "tous");
  const city = typeof params.ville === "string" ? params.ville : "tous";

  const [stats, cities, clients] = await Promise.all([
    getClientListStats(scope),
    getCities(),
    filterClients({
      search,
      status: status as ClientStatus | "tous",
      commercial,
      city,
    }),
  ]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-medium text-text-primary sm:text-3xl">
            {scope ? "Mes clients" : "Clients"}
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            {scope
              ? "Les clients dont vous êtes le commercial responsable."
              : "Retrouvez tous vos clients et suivez leur relation avec ART Cuisine."}
          </p>
        </div>
        <ClientFormDialog
          lockedCommercial={scope ?? undefined}
          trigger={
            <Button>
              <Plus className="h-4 w-4" /> Ajouter un client
            </Button>
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={scope ? "Mes clients" : "Total clients"} value={String(stats.total)} icon={Users} helperText="tous statuts confondus" />
        <StatCard label="Clients actifs" value={String(stats.active)} icon={UserCheck} helperText="actifs ou VIP" />
        <StatCard label="Clients VIP" value={String(stats.vip)} icon={Star} helperText="comptes à forte valeur" />
        <StatCard label="À risque" value={String(stats.atRisk)} icon={UserX} helperText="marqués inactifs" />
      </div>

      <ClientFilters
        search={search}
        status={status}
        commercial={commercial}
        city={city}
        cities={cities}
        hideCommercial={Boolean(scope)}
      />

      <Card className="overflow-hidden">
        <Table className="border-none">
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Ville</TableHead>
              {!scope && <TableHead>Commercial</TableHead>}
              <TableHead>Statut</TableHead>
              <TableHead>Projets actifs</TableHead>
              <TableHead className="text-right">Total dépensé</TableHead>
              <TableHead>Client depuis</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.length === 0 && (
              <TableRow>
                <TableCell colSpan={scope ? 7 : 8} className="py-10 text-center text-sm text-text-muted">
                  Aucun client ne correspond à ces critères.
                </TableCell>
              </TableRow>
            )}
            {clients.map((client) => {
              const financials = getClientFinancials(client.name);
              return (
                <TableRow key={client.id} className="cursor-pointer">
                  <TableCell>
                    <Link
                      href={`/dashboard/clients/${client.id}`}
                      className="focus-ring flex items-center gap-2.5"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-[0.625rem]">{initials(client.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-text-primary hover:text-text-accent">{client.name}</p>
                        <p className="text-xs text-text-muted">{client.email}</p>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell className="text-text-secondary">{client.city}</TableCell>
                  {!scope && <TableCell className="text-text-secondary">{client.commercial}</TableCell>}
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[client.status]}>{client.status}</Badge>
                  </TableCell>
                  <TableCell>{financials.activeProjects}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrencyDA(financials.totalSpent)}</TableCell>
                  <TableCell className="text-text-secondary">{formatShortDate(client.since)}</TableCell>
                  <TableCell>
                    <Link href={`/dashboard/clients/${client.id}`} className="focus-ring flex h-8 w-8 items-center justify-center rounded-md text-text-muted hover:text-text-primary">
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <p className="text-xs text-text-muted">
        {clients.length} client{clients.length > 1 ? "s" : ""} affiché{clients.length > 1 ? "s" : ""} sur {stats.total}.
        {" "}Statuts disponibles : {CLIENT_STATUSES.join(", ")}.
      </p>
    </div>
  );
}
