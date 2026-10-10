import Link from "next/link";
import { Paintbrush, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CreateVernissageJobDialog } from "@/components/dashboard/vernissage/create-vernissage-job-dialog";
import { VERNISSAGE_STAGE_BADGE } from "@/lib/data/vernissage";
import { PROJECT_STAGES } from "@/lib/data/project-records";
import { formatShortDate } from "@/lib/format";
import type { VernissageJobRecord, ProjectRecord } from "@/lib/data/operations";

function ProjectVernissageTab({ project, jobs }: { project: ProjectRecord; jobs: VernissageJobRecord[] }) {
  const isEligible = PROJECT_STAGES.indexOf(project.stage) >= PROJECT_STAGES.indexOf("Vernissage");

  return (
    <div className="flex flex-col gap-4">
      {isEligible && (
        <div className="flex justify-end">
          <CreateVernissageJobDialog lockedProjectId={project.id} />
        </div>
      )}

      {jobs.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-muted">
          {isEligible
            ? "Aucun job de vernissage pour ce projet."
            : "La production doit être terminée avant de lancer le vernissage."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {jobs.map((j) => (
            <li key={j.id}>
              <Link href={`/dashboard/vernissage/${j.id}`}>
                <Card className="flex items-center gap-4 p-4 transition-shadow hover:shadow-elevation-md">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-accent-strong">
                    <Paintbrush className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-text-primary">{j.ref}</p>
                      <Badge variant={VERNISSAGE_STAGE_BADGE[j.stage]}>{j.stage}</Badge>
                    </div>
                    <p className="text-xs text-text-muted">
                      {j.assignedVernisseurs.length > 0 ? j.assignedVernisseurs.join(", ") : "Équipe non assignée"} · échéance {formatShortDate(j.deadline)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="hidden items-center gap-2 sm:flex">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-sunken">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${j.progress}%` }} />
                      </div>
                      <span className="text-xs text-text-muted">{j.progress}%</span>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" />
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export { ProjectVernissageTab };
