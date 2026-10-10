import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowLeft,
  Pencil,
  Users,
  FileText,
  UserRound,
  Palette,
  Factory,
  Paintbrush,
  Wrench,
  CalendarClock,
} from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import type { Role } from "@/lib/auth/roles";
import { getOwnerScope } from "@/lib/data/scope";
import { getClientById, getMessagesForClient } from "@/lib/data/clients";
import { getDevisById } from "@/lib/data/devis";
import { getProjectById, STAGE_BADGE, PRIORITY_BADGE, getTasksForProject, getIssuesForProject, getActivityForProject } from "@/lib/data/project-records";
import { getDocumentsForProject } from "@/lib/data/documents";
import { getDesignVersionsForProject, DESIGN_STATUS_BADGE } from "@/lib/data/design";
import { getProductionOrdersForProject } from "@/lib/data/production";
import { getVernissageJobsForProject } from "@/lib/data/vernissage";
import { getMontageJobsForProject } from "@/lib/data/montage";
import { getActiveCatalogueByCategory } from "@/lib/data/pricing";
import { formatCurrencyDA, formatShortDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StageSelect } from "@/components/dashboard/projects/stage-select";
import { ProjectFormDialog } from "@/components/dashboard/projects/project-form-dialog";
import { TasksTab } from "@/components/dashboard/projects/tasks-tab";
import { IssuesTab } from "@/components/dashboard/projects/issues-tab";
import { PhotosTab } from "@/components/dashboard/projects/photos-tab";
import { ClientMessagesPanel } from "@/components/dashboard/clients/client-messages-panel";
import { DocumentsList, ActivityTab } from "@/components/dashboard/clients/client-profile-tabs";
import { UploadDocumentDialog } from "@/components/dashboard/documents/upload-document-dialog";
import { MeasurementsForm } from "@/components/dashboard/conception/measurements-form";
import { DesignerNotesForm } from "@/components/dashboard/conception/designer-notes-form";
import { DesignVersionsPanel } from "@/components/dashboard/conception/design-versions-panel";
import { ProjectProductionTab } from "@/components/dashboard/production/project-production-tab";
import { ProjectVernissageTab } from "@/components/dashboard/vernissage/project-vernissage-tab";
import { ProjectMontageTab } from "@/components/dashboard/montage/project-montage-tab";
import { ProjectFinanceTab } from "@/components/dashboard/finance/project-finance-tab";
import { ProjectMaterialsTab } from "@/components/dashboard/projects/project-materials-tab";

export async function generateMetadata({ params }: PageProps<"/dashboard/projets/[id]">): Promise<Metadata> {
  const { id } = await params;
  const project = getProjectById(id);
  return { title: project ? `${project.ref} — ART Cuisine` : "Projet — ART Cuisine" };
}

export default async function ProjectDetailPage({ params }: PageProps<"/dashboard/projets/[id]">) {
  const user = await requirePermission("projects.manage");
  const scope = getOwnerScope(user);
  const { id } = await params;

  const project = getProjectById(id);
  if (!project) notFound();
  if (scope && project.commercial !== null && project.commercial !== scope) notFound();

  const client = project.clientId ? await getClientById(project.clientId) : undefined;
  const devis = project.devisId ? await getDevisById(project.devisId) : undefined;
  const tasks = getTasksForProject(project.ref);
  const issues = getIssuesForProject(project.ref);
  const activity = getActivityForProject(project);
  const documents = getDocumentsForProject(project.ref);
  const photos = documents.filter((d) => d.mimeType?.startsWith("image/"));
  const canMessage = hasPermission(user.role as Role, "clients.manage");
  const messages = canMessage ? getMessagesForClient(project.clientName) : [];
  const canSeeFinance = hasPermission(user.role as Role, "finance.manage");
  const designVersions = getDesignVersionsForProject(project.ref);
  const productionOrders = getProductionOrdersForProject(project.ref);
  const vernissageJobs = getVernissageJobsForProject(project.ref);
  const montageJobs = getMontageJobsForProject(project.ref);
  const catalogueByCategory = getActiveCatalogueByCategory();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <Link
        href="/dashboard/projets"
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-text-muted hover:text-text-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Retour aux projets
      </Link>

      <Card className="p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-2xl font-medium text-text-primary sm:text-3xl">{project.name}</h1>
              <Badge variant={STAGE_BADGE[project.stage]}>{project.stage}</Badge>
              <Badge variant={PRIORITY_BADGE[project.priority]}>{project.priority}</Badge>
              <Badge variant={DESIGN_STATUS_BADGE[project.designStatus]}>Design : {project.designStatus}</Badge>
            </div>
            <p className="mt-1 text-sm text-text-muted">{project.ref} · Démarré le {formatShortDate(project.startDate)}</p>

            <dl className="mt-6 grid gap-x-8 gap-y-3 sm:grid-cols-2">
              <div className="flex items-center gap-2.5 text-sm text-text-secondary">
                <UserRound className="h-4 w-4 shrink-0 text-text-muted" /> Commercial : {project.commercial ?? "—"}
              </div>
              <div className="flex items-center gap-2.5 text-sm text-text-secondary">
                <Palette className="h-4 w-4 shrink-0 text-text-muted" /> Designer : {project.designer ?? "—"}
              </div>
              <div className="flex items-center gap-2.5 text-sm text-text-secondary">
                <Factory className="h-4 w-4 shrink-0 text-text-muted" /> Production : {project.productionLead ?? "—"}
              </div>
              <div className="flex items-center gap-2.5 text-sm text-text-secondary">
                <Paintbrush className="h-4 w-4 shrink-0 text-text-muted" /> Vernisseur : {project.vernisseur ?? "—"}
              </div>
              <div className="flex items-center gap-2.5 text-sm text-text-secondary">
                <Wrench className="h-4 w-4 shrink-0 text-text-muted" /> Montage : {project.montageLead ?? "—"}
              </div>
              <div className="flex items-center gap-2.5 text-sm text-text-secondary">
                <CalendarClock className="h-4 w-4 shrink-0 text-text-muted" /> Échéance : {formatShortDate(project.dueDate)}
              </div>
            </dl>
          </div>

          <div className="flex flex-col items-stretch gap-3 sm:min-w-56">
            <div className="text-right">
              <p className="text-xs text-text-muted">Budget</p>
              <p className="text-xl font-medium text-text-primary">{formatCurrencyDA(project.amount)}</p>
            </div>
            <StageSelect projectId={project.id} stage={project.stage} className="h-9 w-full" />
            <ProjectFormDialog
              project={project}
              lockedCommercial={scope ?? undefined}
              trigger={
                <Button variant="outline">
                  <Pencil className="h-3.5 w-3.5" /> Modifier
                </Button>
              }
            />
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3 border-t border-border-subtle pt-6">
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
            <div className="h-full rounded-full bg-accent" style={{ width: `${project.progress}%` }} />
          </div>
          <span className="shrink-0 text-sm font-medium text-text-primary">{project.progress}%</span>
        </div>
      </Card>

      {(client || devis) && (
        <div className="grid gap-4 sm:grid-cols-2">
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
          {devis && (
            <Link href={`/dashboard/devis/${devis.id}`}>
              <Card className="flex h-full flex-col gap-2 p-5 transition-shadow hover:shadow-elevation-md">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-sunken text-accent-strong">
                  <FileText className="h-4 w-4" />
                </span>
                <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Devis d&rsquo;origine</p>
                <p className="font-medium text-text-primary">{devis.ref}</p>
                <p className="text-xs text-text-muted">{devis.status} · {formatCurrencyDA(devis.amount)}</p>
              </Card>
            </Link>
          )}
        </div>
      )}

      <Card className="p-2 sm:p-4">
        <Tabs defaultValue="taches">
          <TabsList className="flex-wrap">
            <TabsTrigger value="taches">Tâches ({tasks.length})</TabsTrigger>
            <TabsTrigger value="conception">Conception ({designVersions.length})</TabsTrigger>
            <TabsTrigger value="production">Production ({productionOrders.length})</TabsTrigger>
            <TabsTrigger value="vernissage">Vernissage ({vernissageJobs.length})</TabsTrigger>
            <TabsTrigger value="montage">Montage ({montageJobs.length})</TabsTrigger>
            <TabsTrigger value="materiaux">Matériaux ({project.materialSelections.length})</TabsTrigger>
            {canSeeFinance && <TabsTrigger value="finance">Finances</TabsTrigger>}
            <TabsTrigger value="problemes">Problèmes ({issues.length})</TabsTrigger>
            <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
            <TabsTrigger value="photos">Photos ({photos.length})</TabsTrigger>
            {canMessage && <TabsTrigger value="messages">Messages ({messages.length})</TabsTrigger>}
            <TabsTrigger value="activite">Activité</TabsTrigger>
          </TabsList>

          <TabsContent value="taches" className="px-2 pb-2">
            <TasksTab projectRef={project.ref} projectId={project.id} tasks={tasks} />
          </TabsContent>
          <TabsContent value="conception" className="px-2 pb-2">
            <div className="flex flex-col gap-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <MeasurementsForm projectId={project.id} measurements={project.measurements} />
                <DesignerNotesForm projectId={project.id} notes={project.designerNotes} />
              </div>
              <DesignVersionsPanel
                projectId={project.id}
                hasMeasurements={project.measurements !== null}
                designStatus={project.designStatus}
                designClientNote={project.designClientNote}
                designValidatedAt={project.designValidatedAt}
                versions={designVersions}
                clientName={client?.name ?? project.clientName}
                clientPhone={client?.phone}
              />
            </div>
          </TabsContent>
          <TabsContent value="production" className="px-2 pb-2">
            <ProjectProductionTab project={project} orders={productionOrders} />
          </TabsContent>
          <TabsContent value="vernissage" className="px-2 pb-2">
            <ProjectVernissageTab project={project} jobs={vernissageJobs} />
          </TabsContent>
          <TabsContent value="montage" className="px-2 pb-2">
            <ProjectMontageTab project={project} jobs={montageJobs} />
          </TabsContent>
          <TabsContent value="materiaux" className="px-2 pb-2">
            <ProjectMaterialsTab
              projectId={project.id}
              catalogueByCategory={catalogueByCategory}
              selectedIds={project.materialSelections}
            />
          </TabsContent>
          {canSeeFinance && (
            <TabsContent value="finance" className="px-2 pb-2">
              <ProjectFinanceTab project={project} />
            </TabsContent>
          )}
          <TabsContent value="problemes" className="px-2 pb-2">
            <IssuesTab projectRef={project.ref} projectId={project.id} issues={issues} />
          </TabsContent>
          <TabsContent value="documents" className="px-2 pb-2">
            <div className="flex flex-col gap-4">
              <div className="flex justify-end">
                <UploadDocumentDialog
                  lockedClientId={project.clientId ?? undefined}
                  lockedClientName={project.clientName}
                  lockedProjectRef={project.ref}
                  trigger={<Button type="button" size="sm" variant="outline">Ajouter un document</Button>}
                />
              </div>
              <DocumentsList documents={documents} />
            </div>
          </TabsContent>
          <TabsContent value="photos" className="px-2 pb-2">
            <PhotosTab projectRef={project.ref} clientId={project.clientId ?? undefined} clientName={project.clientName} photos={photos} />
          </TabsContent>
          {canMessage && (
            <TabsContent value="messages" className="px-2 pb-2">
              {client ? (
                <ClientMessagesPanel clientId={client.id} messages={messages} />
              ) : (
                <p className="py-8 text-center text-sm text-text-muted">Aucun client lié à ce projet.</p>
              )}
            </TabsContent>
          )}
          <TabsContent value="activite" className="px-2 pb-2">
            <ActivityTab activity={activity} />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
