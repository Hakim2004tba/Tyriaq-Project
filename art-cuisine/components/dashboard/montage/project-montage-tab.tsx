import Link from "next/link";
import { Wrench, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CreateMontageJobDialog } from "@/components/dashboard/montage/create-montage-job-dialog";
import { getMontageStatusLabel, getMontageStatusBadge } from "@/lib/data/montage";
import { PROJECT_STAGES } from "@/lib/data/project-records";
import { formatShortDateTime } from "@/lib/format";
import type { MontageJobRecord, ProjectRecord } from "@/lib/data/operations";

function ProjectMontageTab({ project, jobs }: { project: ProjectRecord; jobs: MontageJobRecord[] }) {
  const isEligible = PROJECT_STAGES.indexOf(project.stage) >= PROJECT_STAGES.indexOf("Montage");

  return (
    <div className="flex flex-col gap-4">
      {isEligible && (
        <div className="flex justify-end">
          <CreateMontageJobDialog lockedProjectId={project.id} />
        </div>
      )}

      {jobs.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-muted">
          {isEligible
            ? "Aucune installation planifiée pour ce projet."
            : "Le vernissage doit être terminé avant de planifier la pose."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {jobs.map((j) => (
            <li key={j.id}>
              <Link href={`/dashboard/montage/${j.id}`}>
                <Card className="flex items-center gap-4 p-4 transition-shadow hover:shadow-elevation-md">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-accent-strong">
                    <Wrench className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-text-primary">{j.ref}</p>
                      <Badge variant={getMontageStatusBadge(j)}>{getMontageStatusLabel(j)}</Badge>
                    </div>
                    <p className="text-xs text-text-muted">
                      {j.assignedTeam.length > 0 ? j.assignedTeam.join(", ") : "Équipe non assignée"} · {formatShortDateTime(j.scheduledDate)}
                      {j.assignedVehicle && ` · ${j.assignedVehicle}`}
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

export { ProjectMontageTab };
