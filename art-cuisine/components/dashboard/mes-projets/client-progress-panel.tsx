import { Factory, Paintbrush, Truck, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatShortDate, formatShortDateTime } from "@/lib/format";
import type { ProductionOrderRecord, VernissageJobRecord, MontageJobRecord } from "@/lib/data/operations";

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken">
        <div className="h-full rounded-full bg-accent" style={{ width: `${value}%` }} />
      </div>
      <span className="shrink-0 text-xs font-medium text-text-primary">{value}%</span>
    </div>
  );
}

function ClientProgressPanel({
  productionOrders,
  vernissageJobs,
  montageJobs,
}: {
  productionOrders: ProductionOrderRecord[];
  vernissageJobs: VernissageJobRecord[];
  montageJobs: MontageJobRecord[];
}) {
  if (productionOrders.length === 0 && vernissageJobs.length === 0 && montageJobs.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {productionOrders.map((order) => (
        <Card key={order.id} className="flex flex-col gap-3 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
            <Factory className="h-3.5 w-3.5" /> Production
          </div>
          <Badge variant="info" className="w-fit">{order.stage}</Badge>
          <ProgressBar value={order.progress} />
          <p className="text-xs text-text-muted">Échéance atelier : {formatShortDate(order.deadline)}</p>
        </Card>
      ))}

      {vernissageJobs.map((job) => (
        <Card key={job.id} className="flex flex-col gap-3 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
            <Paintbrush className="h-3.5 w-3.5" /> Vernissage
          </div>
          <Badge variant="info" className="w-fit">{job.stage}</Badge>
          <ProgressBar value={job.progress} />
          <p className="text-xs text-text-muted">Finition : {job.finish}</p>
        </Card>
      ))}

      {montageJobs.map((job) => (
        <Card key={job.id} className="flex flex-col gap-3 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
            <Truck className="h-3.5 w-3.5" /> Installation
          </div>
          {job.cancelled ? (
            <Badge variant="danger" className="w-fit">Annulée</Badge>
          ) : (
            <Badge variant="info" className="w-fit">{job.stage}</Badge>
          )}
          <ProgressBar value={job.progress} />
          <p className="text-xs text-text-muted">Date prévue : {formatShortDateTime(job.scheduledDate)}</p>
          {job.assignedTeam.length > 0 && (
            <p className="text-xs text-text-muted">Équipe : {job.assignedTeam.join(", ")}</p>
          )}
          {job.signedAt && (
            <p className="flex items-center gap-1.5 text-xs text-[var(--status-success-fg)]">
              <CheckCircle2 className="h-3.5 w-3.5" /> Réception signée le {formatShortDate(job.signedAt)}
            </p>
          )}
        </Card>
      ))}
    </div>
  );
}

export { ClientProgressPanel };
