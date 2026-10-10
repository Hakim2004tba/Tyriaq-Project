import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, CalendarClock, UserRound, Users, FileText, FolderKanban, History as HistoryIcon, Share2, Clock } from "lucide-react";
import { requireSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import type { Role } from "@/lib/auth/roles";
import { getOwnerScope } from "@/lib/data/scope";
import { getClientById, getClientByEmail, getClientCommercialMap } from "@/lib/data/clients";
import { getDevisById } from "@/lib/data/devis";
import { getProjectByRef } from "@/lib/data/appointments";
import {
  getDocumentById,
  getDocumentVersions,
  getDocumentShares,
  getDocumentEvents,
} from "@/lib/data/documents";
import { formatShortDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { DocumentCategoryIcon } from "@/components/dashboard/documents/document-icon";
import { DocumentPreview } from "@/components/dashboard/documents/document-preview";
import { UploadVersionDialog } from "@/components/dashboard/documents/upload-version-dialog";
import { SharePanel } from "@/components/dashboard/documents/share-panel";
import { DocumentVersionsList } from "@/components/dashboard/documents/document-versions-list";
import { DocumentHistory } from "@/components/dashboard/documents/document-history";

export async function generateMetadata({ params }: PageProps<"/dashboard/documents/[id]">): Promise<Metadata> {
  const { id } = await params;
  const doc = getDocumentById(id);
  return { title: doc ? `${doc.name} — ART Cuisine` : "Document — ART Cuisine" };
}

export default async function DocumentDetailPage({ params }: PageProps<"/dashboard/documents/[id]">) {
  const user = await requireSession();
  const { id } = await params;

  const doc = getDocumentById(id);
  if (!doc) notFound();

  const role = user.role as Role;
  let canManage = false;
  if (hasPermission(role, "documents.manage")) {
    canManage = true;
    const scope = getOwnerScope(user);
    if (scope && doc.clientId) {
      const commercial = (await getClientCommercialMap()).get(doc.clientId);
      if (commercial !== scope) notFound();
    }
  } else if (hasPermission(role, "documents.view_own")) {
    const client = await getClientByEmail(user.email);
    if (!client || doc.clientId !== client.id) notFound();
  } else {
    redirect("/dashboard");
  }

  const client = doc.clientId ? await getClientById(doc.clientId) : undefined;
  const devis = doc.devisId ? await getDevisById(doc.devisId) : undefined;
  const project = getProjectByRef(doc.projectRef);
  const versions = getDocumentVersions(doc.id);
  const shares = getDocumentShares(doc.id);
  const events = getDocumentEvents(doc.id);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <Link
        href={canManage ? "/dashboard/documents" : "/dashboard/mes-documents"}
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-text-muted hover:text-text-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Retour aux documents
      </Link>

      <Card className="p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-accent-strong">
              <DocumentCategoryIcon category={doc.category} className="h-5 w-5" />
            </span>
            <div>
              <h1 className="font-display text-xl font-medium text-text-primary sm:text-2xl">{doc.name}</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <Badge variant="gold">{doc.category}</Badge>
                <Badge variant="outline">v{doc.version}</Badge>
                <span className="text-xs text-text-muted">{doc.sizeLabel}</span>
              </div>
            </div>
          </div>
          {canManage && <UploadVersionDialog documentId={doc.id} currentVersion={doc.version} />}
        </div>

        <dl className="mt-6 grid gap-x-8 gap-y-3 border-t border-border-subtle pt-6 sm:grid-cols-2">
          <div className="flex items-center gap-2.5 text-sm text-text-secondary">
            <UserRound className="h-4 w-4 shrink-0 text-text-muted" /> Ajouté par {doc.uploadedBy}
          </div>
          <div className="flex items-center gap-2.5 text-sm text-text-secondary">
            <CalendarClock className="h-4 w-4 shrink-0 text-text-muted" /> Mis à jour le {formatShortDate(doc.updatedAt)}
          </div>
        </dl>
      </Card>

      {(client || devis || project) && (
        <div className="grid gap-4 sm:grid-cols-3">
          {client && (
            <Link href={canManage ? `/dashboard/clients/${client.id}` : "#"}>
              <Card className="flex h-full flex-col gap-2 p-5 transition-shadow hover:shadow-elevation-md">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-sunken text-accent-strong">
                  <Users className="h-4 w-4" />
                </span>
                <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Client lié</p>
                <p className="font-medium text-text-primary">{client.name}</p>
                <p className="text-xs text-text-muted">{client.status} · {client.city}</p>
              </Card>
            </Link>
          )}
          {devis && (
            <Link href={canManage ? `/dashboard/devis/${devis.id}` : "#"}>
              <Card className="flex h-full flex-col gap-2 p-5 transition-shadow hover:shadow-elevation-md">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-sunken text-accent-strong">
                  <FileText className="h-4 w-4" />
                </span>
                <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Devis lié</p>
                <p className="font-medium text-text-primary">{devis.ref}</p>
                <p className="text-xs text-text-muted">{devis.status}</p>
              </Card>
            </Link>
          )}
          {project && (
            <Link href={canManage ? `/dashboard/projets/${project.id}` : "#"}>
              <Card className="flex h-full flex-col gap-2 p-5 transition-shadow hover:shadow-elevation-md">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-sunken text-accent-strong">
                  <FolderKanban className="h-4 w-4" />
                </span>
                <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Projet lié</p>
                <p className="font-medium text-text-primary">{project.ref}</p>
                <p className="text-xs text-text-muted">{project.stage} · {project.name}</p>
              </Card>
            </Link>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Aperçu</CardTitle>
          <CardDescription>Prévisualisez, téléchargez ou imprimez le fichier actuel.</CardDescription>
        </CardHeader>
        <CardContent>
          <DocumentPreview documentId={doc.id} dataUrl={doc.dataUrl} mimeType={doc.mimeType} fileName={doc.fileName} />
        </CardContent>
      </Card>

      {canManage && (
        <Card>
          <CardHeader className="flex-row items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-accent-strong">
              <Share2 className="h-5 w-5" />
            </span>
            <div>
              <CardTitle>Partage</CardTitle>
              <CardDescription>Générez un lien public pour envoyer ce document sans compte.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <SharePanel documentId={doc.id} hasFile={Boolean(doc.dataUrl)} shares={shares} />
          </CardContent>
        </Card>
      )}

      {versions.length > 0 && (
        <Card>
          <CardHeader className="flex-row items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-accent-strong">
              <HistoryIcon className="h-5 w-5" />
            </span>
            <div>
              <CardTitle>Versions précédentes</CardTitle>
              <CardDescription>Chaque nouvelle version conserve l&rsquo;ancien fichier ici.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0 px-6 pb-2">
            <DocumentVersionsList versions={versions} />
          </CardContent>
        </Card>
      )}

      {canManage && (
        <Card>
          <CardHeader className="flex-row items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-accent-strong">
              <Clock className="h-5 w-5" />
            </span>
            <div>
              <CardTitle>Historique</CardTitle>
              <CardDescription>Ajouts, versions, partages, consultations et téléchargements.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0 px-6 pb-2">
            <DocumentHistory events={events} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
