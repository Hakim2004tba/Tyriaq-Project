import Link from "next/link";
import { Factory, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CreateProductionOrderDialog } from "@/components/dashboard/production/create-production-order-dialog";
import { PRODUCTION_STAGE_BADGE } from "@/lib/data/production";
import { formatShortDate } from "@/lib/format";
import type { ProductionOrderRecord, ProjectRecord } from "@/lib/data/operations";

function ProjectProductionTab({ project, orders }: { project: ProjectRecord; orders: ProductionOrderRecord[] }) {
  return (
    <div className="flex flex-col gap-4">
      {project.designStatus === "Validé" && (
        <div className="flex justify-end">
          <CreateProductionOrderDialog lockedProjectId={project.id} />
        </div>
      )}

      {orders.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-muted">
          {project.designStatus === "Validé"
            ? "Aucun ordre de fabrication pour ce projet."
            : "Le design doit être validé par le client avant de lancer la production."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/dashboard/production/${o.id}`}>
                <Card className="flex items-center gap-4 p-4 transition-shadow hover:shadow-elevation-md">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-accent-strong">
                    <Factory className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-text-primary">{o.ref}</p>
                      <Badge variant={PRODUCTION_STAGE_BADGE[o.stage]}>{o.stage}</Badge>
                    </div>
                    <p className="text-xs text-text-muted">
                      {o.assignedWorkers.length > 0 ? o.assignedWorkers.join(", ") : "Équipe non assignée"} · échéance {formatShortDate(o.deadline)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="hidden items-center gap-2 sm:flex">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-sunken">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${o.progress}%` }} />
                      </div>
                      <span className="text-xs text-text-muted">{o.progress}%</span>
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

export { ProjectProductionTab };
