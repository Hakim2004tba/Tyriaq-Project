import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Pencil, Star, MapPin, Calendar, Ruler, LayoutGrid, ExternalLink, FolderKanban } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import type { Role } from "@/lib/auth/roles";
import { getPortfolioProjectById } from "@/lib/data/portfolio";
import { PROJECTS } from "@/lib/data/operations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PortfolioFormDialog } from "@/components/dashboard/portfolio/portfolio-form-dialog";
import { PortfolioStatusSelect } from "@/components/dashboard/portfolio/portfolio-status-select";
import { FeatureToggleButton } from "@/components/dashboard/portfolio/feature-toggle-button";
import { PortfolioImageManager } from "@/components/dashboard/portfolio/portfolio-image-manager";

export async function generateMetadata({ params }: PageProps<"/dashboard/portefeuille/[id]">): Promise<Metadata> {
  const { id } = await params;
  const project = getPortfolioProjectById(id);
  return { title: project ? `${project.title} — ART Cuisine` : "Réalisation — ART Cuisine" };
}

export default async function PortfolioDetailPage({ params }: PageProps<"/dashboard/portefeuille/[id]">) {
  const user = await requirePermission("portefeuille.view");
  const canManage = hasPermission(user.role as Role, "portefeuille.manage");
  const { id } = await params;

  const project = getPortfolioProjectById(id);
  if (!project) notFound();

  const linkedProject = project.sourceProjectRef ? PROJECTS.find((p) => p.ref === project.sourceProjectRef) : undefined;
  const candidateProjects = PROJECTS.filter((p) => p.stage === "Terminé").map((p) => ({
    ref: p.ref,
    label: `${p.ref} — ${p.name}`,
  }));

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <Link
        href="/dashboard/portefeuille"
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-text-muted hover:text-text-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Retour au portefeuille
      </Link>

      <Card className="p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-2xl font-medium text-text-primary sm:text-3xl">{project.title}</h1>
              <Badge variant="gold">{project.category}</Badge>
              {project.featured && <Badge variant="gold"><Star className="h-3 w-3 fill-current" /> À la une</Badge>}
              {project.status === "Publié" && (
                <Link
                  href={`/realisations/${project.slug}`}
                  target="_blank"
                  className="flex items-center gap-1 text-xs font-medium text-text-accent hover:opacity-70"
                >
                  Voir la page publique <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </div>
            <p className="mt-1 text-sm text-text-muted">{project.summary}</p>

            <dl className="mt-6 grid gap-x-8 gap-y-3 sm:grid-cols-2">
              <div className="flex items-center gap-2.5 text-sm text-text-secondary">
                <MapPin className="h-4 w-4 shrink-0 text-text-muted" /> {project.location}
              </div>
              <div className="flex items-center gap-2.5 text-sm text-text-secondary">
                <Calendar className="h-4 w-4 shrink-0 text-text-muted" /> {project.year}
              </div>
              <div className="flex items-center gap-2.5 text-sm text-text-secondary">
                <Ruler className="h-4 w-4 shrink-0 text-text-muted" /> {project.surface}
              </div>
              <div className="flex items-center gap-2.5 text-sm text-text-secondary">
                <LayoutGrid className="h-4 w-4 shrink-0 text-text-muted" /> {project.layout}
              </div>
            </dl>
          </div>

          {canManage && (
            <div className="flex flex-col items-stretch gap-3 sm:min-w-56">
              <PortfolioStatusSelect id={project.id} status={project.status} className="h-9 w-full" />
              <div className="flex items-center gap-2">
                <PortfolioFormDialog
                  project={project}
                  candidateProjects={candidateProjects}
                  trigger={
                    <Button variant="outline" className="flex-1">
                      <Pencil className="h-3.5 w-3.5" /> Modifier
                    </Button>
                  }
                />
                <FeatureToggleButton id={project.id} featured={project.featured} />
              </div>
            </div>
          )}
        </div>
      </Card>

      {linkedProject && (
        <Link href={`/dashboard/projets/${linkedProject.id}`}>
          <Card className="flex items-center gap-3 p-5 transition-shadow hover:shadow-elevation-md">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-accent-strong">
              <FolderKanban className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Projet CRM lié</p>
              <p className="font-medium text-text-primary">{linkedProject.ref} — {linkedProject.name}</p>
            </div>
          </Card>
        </Link>
      )}

      {canManage && <PortfolioImageManager projectId={project.id} images={project.images} />}

      <Card className="p-6">
        <h3 className="text-sm font-semibold text-text-primary">Description</h3>
        <div className="mt-3 flex flex-col gap-3">
          {project.description.length === 0 ? (
            <p className="text-sm text-text-muted">Aucune description.</p>
          ) : (
            project.description.map((paragraph, i) => (
              <p key={i} className="text-sm leading-relaxed text-text-secondary">{paragraph}</p>
            ))
          )}
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">Matériaux</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {project.materials.length === 0 ? (
              <p className="text-sm text-text-muted">Aucun matériau renseigné.</p>
            ) : (
              project.materials.map((m) => <Badge key={m} variant="outline">{m}</Badge>)
            )}
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">Finitions</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {project.finishes.length === 0 ? (
              <p className="text-sm text-text-muted">Aucune finition renseignée.</p>
            ) : (
              project.finishes.map((f) => <Badge key={f} variant="gold">{f}</Badge>)
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
