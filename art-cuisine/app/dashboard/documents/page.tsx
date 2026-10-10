import Link from "next/link";
import { Files, Layers, FileCheck2, Share2, Upload, ChevronRight } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { getOwnerScope } from "@/lib/data/scope";
import { getClientOptions, getClientCommercialMap } from "@/lib/data/clients";
import { getDevisOptions } from "@/lib/data/devis";
import { getProjectOptions } from "@/lib/data/appointments";
import { filterDocuments, getDocumentListStats } from "@/lib/data/documents";
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
import { DocumentFilters } from "@/components/dashboard/documents/document-filters";
import { UploadDocumentDialog } from "@/components/dashboard/documents/upload-document-dialog";
import { DocumentCategoryIcon } from "@/components/dashboard/documents/document-icon";
import { formatShortDate } from "@/lib/format";
import type { DocumentCategory } from "@/lib/data/operations";

export default async function DocumentsPage({ searchParams }: PageProps<"/dashboard/documents">) {
  const user = await requirePermission("documents.manage");
  const scope = getOwnerScope(user);

  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q : "";
  const category = typeof params.categorie === "string" ? params.categorie : "toutes";

  const commercialByClient = await getClientCommercialMap();
  const stats = getDocumentListStats(scope, commercialByClient);
  const documents = filterDocuments({ search, category: category as DocumentCategory | "toutes" }, commercialByClient, scope);

  const [clientOptions, devisOptions] = await Promise.all([getClientOptions(scope), getDevisOptions(scope)]);
  const projectOptions = getProjectOptions(scope);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-medium text-text-primary sm:text-3xl">Documents</h1>
          <p className="mt-1 text-sm text-text-muted">
            Devis PDF, contrats, factures, reçus, plans, croquis, designs, rendus, production, pose, réception et garanties.
          </p>
        </div>
        <UploadDocumentDialog
          clients={clientOptions}
          devisOptions={devisOptions}
          projectOptions={projectOptions}
          trigger={
            <Button>
              <Upload className="h-4 w-4" /> Ajouter un document
            </Button>
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Documents" value={String(stats.total)} icon={Files} helperText="tous statuts confondus" />
        <StatCard label="Catégories utilisées" value={String(stats.categories)} icon={Layers} helperText="sur 13 disponibles" />
        <StatCard label="Avec fichier" value={String(stats.withFile)} icon={FileCheck2} helperText="aperçu et téléchargement possibles" />
        <StatCard label="Liens de partage actifs" value={String(stats.sharedActive)} icon={Share2} helperText="non expirés" />
      </div>

      <DocumentFilters search={search} category={category} />

      <Card className="overflow-hidden">
        <Table className="border-none">
          <TableHeader>
            <TableRow>
              <TableHead>Document</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Mis à jour</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-text-muted">
                  Aucun document ne correspond à ces critères.
                </TableCell>
              </TableRow>
            )}
            {documents.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell>
                  <Link href={`/dashboard/documents/${doc.id}`} className="flex items-center gap-2.5 font-medium text-text-primary hover:text-text-accent">
                    <DocumentCategoryIcon category={doc.category} className="h-4 w-4 shrink-0 text-text-muted" />
                    {doc.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="gold">{doc.category}</Badge>
                </TableCell>
                <TableCell className="text-text-secondary">{doc.clientName}</TableCell>
                <TableCell className="text-text-secondary">v{doc.version}</TableCell>
                <TableCell className="text-text-secondary">{formatShortDate(doc.updatedAt)}</TableCell>
                <TableCell>
                  <Link href={`/dashboard/documents/${doc.id}`} className="focus-ring flex h-8 w-8 items-center justify-center rounded-md text-text-muted hover:text-text-primary">
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
