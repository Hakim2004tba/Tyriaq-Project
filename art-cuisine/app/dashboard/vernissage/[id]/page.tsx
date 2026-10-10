import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Users, FolderKanban, CalendarClock, UsersRound, Upload, Palette } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { getClientById } from "@/lib/data/clients";
import { getProjectById, getIssuesForProject } from "@/lib/data/project-records";
import {
  getVernissageJobById,
  getPiecesForJob,
  getChecklistForJob,
  getQualityControlsForJob,
  getActivityForJob,
  getVernisseurScope,
  canAccessVernissageJob,
  VERNISSAGE_STAGE_BADGE,
  CABINET_FINISHES,
} from "@/lib/data/vernissage";
import { getDocumentsForProject } from "@/lib/data/documents";
import { formatShortDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { VernissageStageSelect } from "@/components/dashboard/vernissage/vernissage-stage-select";
import { WhatsAppShareLink } from "@/components/dashboard/devis/whatsapp-share-link";
import { EditVernissageJobDialog } from "@/components/dashboard/vernissage/edit-vernissage-job-dialog";
import { PiecesPanel } from "@/components/dashboard/vernissage/pieces-panel";
import { ChecklistPanel } from "@/components/dashboard/vernissage/checklist-panel";
import { QualityControlPanel } from "@/components/dashboard/vernissage/quality-control-panel";
import { VernissageNotesForm } from "@/components/dashboard/vernissage/vernissage-notes-form";
import { DocumentsList, ActivityTab } from "@/components/dashboard/clients/client-profile-tabs";
import { PhotosTab } from "@/components/dashboard/projects/photos-tab";
import { IssuesTab } from "@/components/dashboard/projects/issues-tab";
import { UploadDocumentDialog } from "@/components/dashboard/documents/upload-document-dialog";
import type { ProjectPriority } from "@/lib/data/operations";

const PRIORITY_BADGE: Record<ProjectPriority, "neutral" | "info" | "warning" | "danger"> = {
  Basse: "neutral",
  Normale: "info",
  Haute: "warning",
  Urgente: "danger",
};

export async function generateMetadata({ params }: PageProps<"/dashboard/vernissage/[id]">): Promise<Metadata> {
  const { id } = await params;
  const job = getVernissageJobById(id);
  return { title: job ? `${job.ref} — ART Cuisine` : "Vernissage — ART Cuisine" };
}

export default async function VernissageJobDetailPage({ params }: PageProps<"/dashboard/vernissage/[id]">) {
  const user = await requirePermission("vernissage.manage");
  const scope = getVernisseurScope(user);
  const { id } = await params;

  const job = getVernissageJobById(id);
  if (!job) notFound();
  if (!canAccessVernissageJob(scope, job)) notFound();

  const project = getProjectById(job.projectId);
  if (!project) notFound();

  const client = project.clientId ? await getClientById(project.clientId) : undefined;
  const pieces = getPiecesForJob(job.id);
  const checklist = getChecklistForJob(job.id);
  const controls = getQualityControlsForJob(job.id);
  const activity = getActivityForJob(job.ref);
  const documents = getDocumentsForProject(job.projectRef);
  const photos = documents.filter((d) => d.mimeType?.startsWith("image/"));
  const issues = getIssuesForProject(job.projectRef);
  const colorLabel = CABINET_FINISHES.find((f) => f.hex === job.color)?.label ?? job.color;

  const doneCount = checklist.filter((c) => c.done).length;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <Link
        href="/dashboard/vernissage"
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-text-muted hover:text-text-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Retour au vernissage
      </Link>

      <Card className="p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-2xl font-medium text-text-primary sm:text-3xl">{job.ref}</h1>
              <Badge variant={VERNISSAGE_STAGE_BADGE[job.stage]}>{job.stage}</Badge>
              <Badge variant={PRIORITY_BADGE[job.priority]}>{job.priority}</Badge>
            </div>
            <p className="mt-1 text-sm text-text-muted">{project.name} · {job.clientName}</p>

            <dl className="mt-6 grid gap-x-8 gap-y-3 sm:grid-cols-2">
              <div className="flex items-center gap-2.5 text-sm text-text-secondary">
                <CalendarClock className="h-4 w-4 shrink-0 text-text-muted" /> Échéance : {formatShortDate(job.deadline)}
              </div>
              <div className="flex items-center gap-2.5 text-sm text-text-secondary">
                <Palette className="h-4 w-4 shrink-0 text-text-muted" />
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-border-subtle" style={{ backgroundColor: job.color }} />
                  {colorLabel} · {job.finish}
                </span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-text-secondary sm:col-span-2">
                <UsersRound className="h-4 w-4 shrink-0 text-text-muted" />
                Équipe : {job.assignedVernisseurs.length > 0 ? job.assignedVernisseurs.join(", ") : "Non assignée"}
              </div>
            </dl>
          </div>

          <div className="flex flex-col items-stretch gap-3 sm:min-w-56">
            <div className="text-right">
              <p className="text-xs text-text-muted">Avancement</p>
              <p className="text-xl font-medium text-text-primary">{job.progress}%</p>
            </div>
            <VernissageStageSelect jobId={job.id} stage={job.stage} className="h-9 w-full" />
            <EditVernissageJobDialog job={job} />
            <WhatsAppShareLink
              phone={client?.phone ?? null}
              message={`Bonjour ${job.clientName}, votre cuisine (${project.name}) vient de passer à l'étape « ${job.stage} » du vernissage — avancement : ${job.progress}%. N'hésitez pas à nous contacter pour toute question.`}
            />
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3 border-t border-border-subtle pt-6">
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
            <div className="h-full rounded-full bg-accent" style={{ width: `${job.progress}%` }} />
          </div>
          <span className="shrink-0 text-sm font-medium text-text-primary">{job.progress}%</span>
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

      <VernissageNotesForm jobId={job.id} notes={job.notes} />

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
            <PiecesPanel jobId={job.id} pieces={pieces} />
          </TabsContent>
          <TabsContent value="checklist" className="px-2 pb-2">
            <ChecklistPanel jobId={job.id} items={checklist} />
          </TabsContent>
          <TabsContent value="qualite" className="px-2 pb-2">
            <QualityControlPanel jobId={job.id} canReview={job.stage === "Contrôle qualité"} controls={controls} approvedAt={job.approvedAt} />
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
