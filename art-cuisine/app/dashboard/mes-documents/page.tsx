import Link from "next/link";
import { Files, ChevronRight } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { getClientByEmail } from "@/lib/data/clients";
import { getDocumentsForClient } from "@/lib/data/documents";
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
import { DocumentCategoryIcon } from "@/components/dashboard/documents/document-icon";
import { formatShortDate } from "@/lib/format";

export default async function MesDocumentsPage() {
  const user = await requirePermission("documents.view_own");
  const client = await getClientByEmail(user.email);

  if (!client) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 py-16 text-center">
        <Files className="h-8 w-8 text-text-muted" />
        <p className="text-sm text-text-muted">
          Aucune fiche client n&rsquo;est associée à votre compte pour le moment. Contactez votre commercial.
        </p>
      </div>
    );
  }

  const documents = getDocumentsForClient(client.id);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-medium text-text-primary sm:text-3xl">Mes documents</h1>
        <p className="mt-1 text-sm text-text-muted">
          Devis, contrats, factures, reçus, plans et garanties liés à votre projet.
        </p>
      </div>

      <Card className="overflow-hidden">
        <Table className="border-none">
          <TableHeader>
            <TableRow>
              <TableHead>Document</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Mis à jour</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm text-text-muted">
                  Aucun document pour le moment.
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
