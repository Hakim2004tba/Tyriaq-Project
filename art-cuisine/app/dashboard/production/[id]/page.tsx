import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Users, FolderKanban, CalendarClock, UsersRound, Upload } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { getOwnerScope } from "@/lib/data/scope";
import { getClientById } from "@/lib/data/clients";
import { getProjectById } from "@/lib/data/project-records";
import {
  getProductionOrderById,
  getPiecesForOrder,
  getChecklistForOrder,
  getQualityControlsForOrder,
  getActivityForOrder,
  PRODUCTION_STAGE_BADGE,
} from "@/lib/data/production";
import { getDocumentsForProject } from "@/lib/data/documents";
import { getIssuesForProject } from "@/lib/data/project-records";
import { formatShortDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ProductionStageSelect } from "@/components/dashboard/production/production-stage-select";
import { EditProductionOrderDialog } from "@/components/dashboard/production/edit-production-order-dialog";
import { PiecesPanel } from "@/components/dashboard/production/pieces-panel";
import { ChecklistPanel } from "@/components/dashboard/production/checklist-panel";
import { QualityControlPanel } from "@/components/dashboard/production/quality-control-panel";
import { WorkshopNotesForm } from "@/components/dashboard/production/workshop-notes-form";
import { DocumentsList, ActivityTab } from "@/components/dashboard/clients/client-profile-tabs";
import { PhotosTab } from "@/components/dashboard/projects/photos-tab";
import { IssuesTab } from "@/components/dashboard/projects/issues-tab";
import { UploadDocumentDialog } from "@/components/dashboard/documents/upload-document-dialog";
import { WhatsAppShareLink } from "@/components/dashboard/devis/whatsapp-share-link";
import type { ProjectPriority } from "@/lib/data/operations";

const PRIORITY_BADGE: Record<ProjectPriority, "neutral" | "info" | "warning" | "danger"> = {
  Basse: "neutral",
  Normale: "info",
  Haute: "warning",
  Urgente: "danger",
};

export async function generateMetadata({ params }: PageProps<"/dashboard/production/[id]">): Promise<Metadata> {
  const { id } = await params;
  const order = getProductionOrderById(id);
  return { title: order ? `${order.ref} — ART Cuisine` : "Production — ART Cuisine" };
}

export default async function ProductionOrderDetailPage({ params }: PageProps<"/dashboard/production/[id]">) {
  const user = await requirePermission("production.manage");
  const scope = getOwnerScope(user);
  const { id } = await params;

  const order = getProductionOrderById(id);
  if (!order) notFound();

  const project = getProjectById(order.projectId);
  if (!project) notFound();
  if (scope && project.commercial !== null && project.commercial !== scope) notFound();

  const client = project.clientId ? await getClientById(project.clientId) : undefined;
  const pieces = getPiecesForOrder(order.id);
  const checklist = getChecklistForOrder(order.id);
  const controls = getQualityControlsForOrder(order.id);
  const activity = getActivityForOrder(order.ref);
  const documents = getDocumentsForProject(order.projectRef);
  const photos = documents.filter((d) => d.mimeType?.startsWith("image/"));
  const issues = getIssuesForProject(order.projectRef);

  const doneCount = checklist.filter((c) => c.done).length;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <Link
        href="/dashboard/production"
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-text-muted hover:text-text-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Retour à la production
      </Link>

      <Card className="p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-2xl font-medium text-text-primary sm:text-3xl">{order.ref}</h1>
              <Badge variant={PRODUCTION_STAGE_BADGE[order.stage]}>{order.stage}</Badge>
              <Badge variant={PRIORITY_BADGE[order.priority]}>{order.priority}</Badge>
            </div>
            <p className="mt-1 text-sm text-text-muted">{project.name} · {order.clientName}</p>

            <dl className="mt-6 grid gap-x-8 gap-y-3 sm:grid-cols-2">
              <div className="flex items-center gap-2.5 text-sm text-text-secondary">
                <CalendarClock className="h-4 w-4 shrink-0 text-text-muted" /> Échéance : {formatShortDate(order.deadline)}
              </div>
              <div className="flex items-center gap-2.5 text-sm text-text-secondary sm:col-span-2">
                <UsersRound className="h-4 w-4 shrink-0 text-text-muted" />
                Équipe : {order.assignedWorkers.length > 0 ? order.assignedWorkers.join(", ") : "Non assignée"}
              </div>
            </dl>
          </div>

          <div className="flex flex-col items-stretch gap-3 sm:min-w-56">
            <div className="text-right">
              <p className="text-xs text-text-muted">Avancement</p>
              <p className="text-xl font-medium text-text-primary">{order.progress}%</p>
            </div>
            <ProductionStageSelect orderId={order.id} stage={order.stage} className="h-9 w-full" />
            <EditProductionOrderDialog order={order} />
            <WhatsAppShareLink
              phone={client?.phone ?? null}
              message={`Bonjour ${order.clientName}, votre cuisine (${project.name}) vient de passer à l'étape « ${order.stage} » — avancement : ${order.progress}%. N'hésitez pas à nous contacter pour toute question.`}
            />
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3 border-t border-border-subtle pt-6">
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
            <div className="h-full rounded-full bg-accent" style={{ width: `${order.progress}%` }} />
          </div>
          <span className="shrink-0 text-sm font-medium text-text-primary">{order.progress}%</span>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href={`/dashboard/projets/${project.id}`}>
          <Card className="flex h-full flex-col gap-2 p-5 transition-shadow hover:shadow-elevation-md">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-sunken text-accent-strong">
              <FolderKanban className="h-4 w-4" />
            </span>
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Projet lié</p>
            <p className="font-medium text-text-primary">{project.ref}</p>
            <p className="text-xs text-text-muted">{project.stage} · {project.name}</p>
          </Card>
        </Link>
        {client && (
          <Link href={`/dashboard/clients/${client.id}`}>
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
      </div>

      <WorkshopNotesForm orderId={order.id} notes={order.workshopNotes} />

      <Card className="p-2 sm:p-4">
        <Tabs defaultValue="pieces">
          <TabsList className="flex-wrap">
            <TabsTrigger value="pieces">Pièces ({pieces.length})</TabsTrigger>
            <TabsTrigger value="checklist">Checklist ({doneCount}/{checklist.length})</TabsTrigger>
            <TabsTrigger value="qualite">Qualité ({controls.length})</TabsTrigger>
            <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
            <TabsTrigger value="photos">Photos ({photos.length})</TabsTrigger>
            <TabsTrigger value="problemes">Problèmes ({issues.length})</TabsTrigger>
            <TabsTrigger value="historique">Historique</TabsTrigger>
          </TabsList>

          <TabsContent value="pieces" className="px-2 pb-2">
            <PiecesPanel orderId={order.id} pieces={pieces} />
          </TabsContent>
          <TabsContent value="checklist" className="px-2 pb-2">
            <ChecklistPanel orderId={order.id} items={checklist} />
          </TabsContent>
          <TabsContent value="qualite" className="px-2 pb-2">
            <QualityControlPanel orderId={order.id} canReview={order.stage === "Contrôle qualité"} controls={controls} />
          </TabsContent>
          <TabsContent value="documents" className="px-2 pb-2">
            <div className="flex flex-col gap-4">
              <div className="flex justify-end">
                <UploadDocumentDialog
                  lockedClientId={project.clientId ?? undefined}
                  lockedClientName={project.clientName}
                  lockedProjectRef={project.ref}
                  trigger={
                    <Button type="button" size="sm" variant="outline">
                      <Upload className="h-3.5 w-3.5" /> Ajouter
                    </Button>
                  }
                />
              </div>
              <DocumentsList documents={documents} />
            </div>
          </TabsContent>
          <TabsContent value="photos" className="px-2 pb-2">
            <PhotosTab projectRef={project.ref} clientId={project.clientId ?? undefined} clientName={project.clientName} photos={photos} />
          </TabsContent>
          <TabsContent value="problemes" className="px-2 pb-2">
            <IssuesTab projectRef={project.ref} projectId={project.id} issues={issues} />
          </TabsContent>
          <TabsContent value="historique" className="px-2 pb-2">
            <ActivityTab activity={activity} />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
