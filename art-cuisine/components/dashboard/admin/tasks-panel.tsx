import { ListChecks } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatShortDate } from "@/lib/format";
import { getTasksMetrics, isOverdue } from "@/lib/data/metrics";

const PRIORITY_VARIANT: Record<string, "neutral" | "info" | "warning"> = {
  Basse: "neutral",
  Normale: "info",
  Haute: "warning",
};

function TasksPanel() {
  const tasks = getTasksMetrics();

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-accent-strong">
          <ListChecks className="h-5 w-5" />
        </span>
        <div>
          <CardTitle>Tâches en attente</CardTitle>
          <CardDescription>
            {tasks.pendingCount} tâche{tasks.pendingCount > 1 ? "s" : ""} à traiter, dont {tasks.overdueCount} en retard.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table className="border-none">
          <TableHeader>
            <TableRow>
              <TableHead>Tâche</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Référence</TableHead>
              <TableHead>Échéance</TableHead>
              <TableHead>Priorité</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.list.map((t) => {
              const overdue = isOverdue(t.dueDate);
              return (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.title}</TableCell>
                  <TableCell className="text-text-secondary">{t.role}</TableCell>
                  <TableCell className="text-text-secondary">{t.relatedRef}</TableCell>
                  <TableCell className={cn(overdue && "font-medium text-[var(--status-danger-fg)]")}>
                    {formatShortDate(t.dueDate)}
                    {overdue && " · en retard"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={PRIORITY_VARIANT[t.priority]}>{t.priority}</Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export { TasksPanel };
