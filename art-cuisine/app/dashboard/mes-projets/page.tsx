import { FolderKanban, UserRound, Palette, Wrench, CalendarClock } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { getClientByEmail } from "@/lib/data/clients";
import { getProjectsForClient, STAGE_BADGE, getIssuesForProject } from "@/lib/data/project-records";
import { getDocumentsForProject } from "@/lib/data/documents";
import { getLatestDesignVersion, getDesignVersionsForProject, isDesignAwaitingClient, DESIGN_STATUS_BADGE } from "@/lib/data/design";
import { getProductionOrdersForProject } from "@/lib/data/production";
import { getVernissageJobsForProject } from "@/lib/data/vernissage";
import { getMontageJobsForProject } from "@/lib/data/montage";
import { formatCurrencyDA, formatShortDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { StageStepper } from "@/components/dashboard/projects/stage-stepper";
import { ClientDesignPanel } from "@/components/dashboard/mes-projets/client-design-panel";
import { ClientProgressPanel } from "@/components/dashboard/mes-projets/client-progress-panel";

export default async function MesProjetsPage() {
  const user = await requirePermission("projects.view_own");
  const client = await getClientByEmail(user.email);

  if (!client) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 py-16 text-center">
        <FolderKanban className="h-8 w-8 text-text-muted" />
        <p className="text-sm text-text-muted">
          Aucune fiche client n&rsquo;est associée à votre compte pour le moment. Contactez votre commercial.
        </p>
      </div>
    );
  }

  const projects = getProjectsForClient(client.id);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-medium text-text-primary sm:text-3xl">Mes projets</h1>
        <p className="mt-1 text-sm text-text-muted">Le suivi détaillé de votre cuisine, étape par étape.</p>
      </div>

      {projects.length === 0 && (
        <Card className="p-10 text-center text-sm text-text-muted">Aucun projet pour le moment.</Card>
      )}

      {projects.map((project) => {
        const documents = getDocumentsForProject(project.ref);
        const openIssues = getIssuesForProject(project.ref).filter((i) => i.status !== "Résolu");
        const latestDesignVersion = getLatestDesignVersion(project.ref);
        const showDesignPanel = isDesignAwaitingClient(project.designStatus) && latestDesignVersion;
        const designVersions = getDesignVersionsForProject(project.ref);
        const productionOrders = getProductionOrdersForProject(project.ref);
        const vernissageJobs = getVernissageJobsForProject(project.ref);
        const montageJobs = getMontageJobsForProject(project.ref);

        return (
          <Card key={project.id}>
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle>{project.name}</CardTitle>
                  <Badge variant={STAGE_BADGE[project.stage]}>{project.stage}</Badge>
                  {project.designStatus !== "Validé" && (
                    <Badge variant={DESIGN_STATUS_BADGE[project.designStatus]}>Design : {project.designStatus}</Badge>
                  )}
                </div>
                <CardDescription className="mt-1">{project.ref} · échéance {formatShortDate(project.dueDate)}</CardDescription>
              </div>
              <div className="text-right">
                <p className="text-xs text-text-muted">Budget</p>
                <p className="text-lg font-medium text-text-primary">{formatCurrencyDA(project.amount)}</p>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-6 sm:flex-row sm:gap-10">
              <div className="sm:w-64 sm:shrink-0">
                <StageStepper stage={project.stage} />
              </div>
              <div className="flex flex-1 flex-col gap-5">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${project.progress}%` }} />
                  </div>
                  <span className="shrink-0 text-sm font-medium text-text-primary">{project.progress}%</span>
                </div>

                <dl className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-center gap-2.5 text-sm text-text-secondary">
                    <UserRound className="h-4 w-4 shrink-0 text-text-muted" /> Commercial : {project.commercial ?? "—"}
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-text-secondary">
                    <Palette className="h-4 w-4 shrink-0 text-text-muted" /> Designer : {project.designer ?? "—"}
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-text-secondary">
                    <Wrench className="h-4 w-4 shrink-0 text-text-muted" /> Montage : {project.montageLead ?? "—"}
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-text-secondary">
                    <CalendarClock className="h-4 w-4 shrink-0 text-text-muted" /> {documents.length} document{documents.length > 1 ? "s" : ""}
                  </div>
                </dl>

                {openIssues.length > 0 && (
                  <p className="rounded-md border border-border-subtle bg-surface-sunken px-4 py-3 text-sm text-text-secondary">
                    {openIssues.length} point{openIssues.length > 1 ? "s" : ""} en cours de traitement par notre équipe.
                  </p>
                )}

                {showDesignPanel && <ClientDesignPanel projectId={project.id} latestVersion={latestDesignVersion} />}

                {designVersions.length > 1 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
                      Historique des versions ({designVersions.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {designVersions.map((v) => (
                        <div key={v.id} className="flex items-center gap-1.5 rounded-md border border-border-subtle bg-surface-sunken px-2.5 py-1.5 text-xs text-text-secondary">
                          v{v.version} · {formatShortDate(v.createdAt)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>

            {(productionOrders.length > 0 || vernissageJobs.length > 0 || montageJobs.length > 0) && (
              <CardContent className="border-t border-border-subtle pt-5">
                <ClientProgressPanel productionOrders={productionOrders} vernissageJobs={vernissageJobs} montageJobs={montageJobs} />
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
