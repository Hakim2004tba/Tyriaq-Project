import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Users, FolderKanban, UsersRound, Truck, Upload, Ban } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { getClientById } from "@/lib/data/clients";
import { getProjectById, getIssuesForProject } from "@/lib/data/project-records";
import {
  getMontageJobById,
  getMissingPiecesForJob,
  getChecklistForJob,
  getPhotosForJob,
  getActivityForJob,
  getMontageScope,
  canAccessMontageJob,
  getMontageStatusLabel,
  getMontageStatusBadge,
} from "@/lib/data/montage";
import { getDocumentsForProject } from "@/lib/data/documents";
import { formatShortDate, formatShortDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MontageStageSelect } from "@/components/dashboard/montage/montage-stage-select";
import { EditMontageJobDialog } from "@/components/dashboard/montage/edit-montage-job-dialog";
import { CancelMontageJobDialog } from "@/components/dashboard/montage/cancel-montage-job-dialog";
import { JourneyActions } from "@/components/dashboard/montage/journey-actions";
import { ClientContactCard } from "@/components/dashboard/montage/client-contact-card";
import { InstructionsForm } from "@/components/dashboard/montage/instructions-form";
import { ChecklistPanel } from "@/components/dashboard/montage/checklist-panel";
import { MissingPiecesPanel } from "@/components/dashboard/montage/missing-pieces-panel";
import { PhotosPanel } from "@/components/dashboard/montage/photos-panel";
import { ClientReceptionPanel } from "@/components/dashboard/montage/client-reception-panel";
import { DocumentsList, ActivityTab } from "@/components/dashboard/clients/client-profile-tabs";
import { IssuesTab } from "@/components/dashboard/projects/issues-tab";
import { UploadDocumentDialog } from "@/components/dashboard/documents/upload-document-dialog";
import type { ProjectPriority } from "@/lib/data/operations";

const PRIORITY_BADGE: Record<ProjectPriority, "neutral" | "info" | "warning" | "danger"> = {
  Basse: "neutral",
  Normale: "info",
  Haute: "warning",
  Urgente: "danger",
};

export async function generateMetadata({ params }: PageProps<"/dashboard/montage/[id]">): Promise<Metadata> {
  const { id } = await params;
  const job = getMontageJobById(id);
  return { title: job ? `${job.ref} — ART Cuisine` : "Montage — ART Cuisine" };
}

export default async function MontageJobDetailPage({ params }: PageProps<"/dashboard/montage/[id]">) {
  const user = await requirePermission("montage.manage");
  const scope = getMontageScope(user);
  const { id } = await params;

  const job = getMontageJobById(id);
  if (!job) notFound();
  if (!canAccessMontageJob(scope, job)) notFound();

  const project = getProjectById(job.projectId);
  if (!project) notFound();

  const client = project.clientId ? await getClientById(project.clientId) : undefined;
  const missingPieces = getMissingPiecesForJob(job.id);
  const checklist = getChecklistForJob(job.id);
  const photos = getPhotosForJob(job.id);
  const activity = getActivityForJob(job.ref);
  const documents = getDocumentsForProject(job.projectRef);
  const issues = getIssuesForProject(job.projectRef);

  const doneCount = checklist.filter((c) => c.done).length;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <Link
        href="/dashboard/montage"
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-text-muted hover:text-text-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Retour au montage
      </Link>

      <Card className="p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-2xl font-medium text-text-primary sm:text-3xl">{job.ref}</h1>
              <Badge variant={getMontageStatusBadge(job)}>{getMontageStatusLabel(job)}</Badge>
              <Badge variant={PRIORITY_BADGE[job.priority]}>{job.priority}</Badge>
            </div>
            <p className="mt-1 text-sm text-text-muted">{project.name} · {job.clientName}</p>

            <dl className="mt-6 grid gap-x-8 gap-y-3 sm:grid-cols-2">
              <div className="flex items-center gap-2.5 text-sm text-text-secondary sm:col-span-2">
                {formatShortDateTime(job.scheduledDate)}
              </div>
              <div className="flex items-center gap-2.5 text-sm text-text-secondary sm:col-span-2">
                <UsersRound className="h-4 w-4 shrink-0 text-text-muted" />
                Équipe : {job.assignedTeam.length > 0 ? job.assignedTeam.join(", ") : "Non assignée"}
              </div>
              <div className="flex items-center gap-2.5 text-sm text-text-secondary sm:col-span-2">
                <Truck className="h-4 w-4 shrink-0 text-text-muted" />
                Véhicule : {job.assignedVehicle ?? "Non assigné"}
              </div>
            </dl>
          </div>

          <div className="flex flex-col items-stretch gap-3 sm:min-w-56">
            <div className="text-right">
              <p className="text-xs text-text-muted">Avancement</p>
              <p className="text-xl font-medium text-text-primary">{job.progress}%</p>
            </div>
            {!job.cancelled && (
              <>
                <MontageStageSelect jobId={job.id} stage={job.stage} className="h-9 w-full" />
                <EditMontageJobDialog job={job} />
                <CancelMontageJobDialog jobId={job.id} jobRef={job.ref} />
              </>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3 border-t border-border-subtle pt-6">
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
            <div className="h-full rounded-full bg-accent" style={{ width: `${job.progress}%` }} />
          </div>
          <span className="shrink-0 text-sm font-medium text-text-primary">{job.progress}%</span>
        </div>

        {job.cancelled ? (
          <div className="mt-6 flex items-center gap-2.5 rounded-md border border-[var(--status-danger-fg)]/30 bg-[var(--status-danger-bg)] p-4">
            <Ban className="h-4 w-4 shrink-0 text-[var(--status-danger-fg)]" />
            <p className="text-sm text-text-secondary">
              Installation annulée le {job.cancelledAt && formatShortDate(job.cancelledAt)} — {job.cancelledReason}
            </p>
          </div>
        ) : (
          <div className="mt-6 border-t border-border-subtle pt-6">
            <JourneyActions jobId={job.id} stage={job.stage} />
          </div>
        )}
      </Card>

      {client && (
        <ClientContactCard clientName={client.name} address={client.address} phone={client.phone} projectRef={project.ref} stage={job.stage} />
      )}

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

      <InstructionsForm jobId={job.id} instructions={job.instructions} />

      <Card className="p-2 sm:p-4">
        <Tabs defaultValue="checklist">
          <TabsList className="flex-wrap">
            <TabsTrigger value="checklist">Checklist ({doneCount}/{checklist.length})</TabsTrigger>
            <TabsTrigger value="manquantes">Pièces manquantes ({missingPieces.length})</TabsTrigger>
            <TabsTrigger value="photos">Photos ({photos.length})</TabsTrigger>
            <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
            <TabsTrigger value="reception">Réception client</TabsTrigger>
            <TabsTrigger value="problemes">Problèmes ({issues.length})</TabsTrigger>
            <TabsTrigger value="historique">Historique</TabsTrigger>
          </TabsList>

          <TabsContent value="checklist" className="px-2 pb-2">
            <ChecklistPanel jobId={job.id} items={checklist} />
          </TabsContent>
          <TabsContent value="manquantes" className="px-2 pb-2">
            <MissingPiecesPanel jobId={job.id} pieces={missingPieces} />
          </TabsContent>
          <TabsContent value="photos" className="px-2 pb-2">
            <PhotosPanel jobId={job.id} photos={photos} />
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
          <TabsContent value="reception" className="px-2 pb-2">
            <ClientReceptionPanel
              jobId={job.id}
              canSign={!job.cancelled && job.stage === "Réception client"}
              clientName={job.clientName}
              signedBy={job.signedBy}
              signedAt={job.signedAt}
              signatureDataUrl={job.signatureDataUrl}
            />
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
