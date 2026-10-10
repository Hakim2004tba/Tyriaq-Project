"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { FormMessage } from "@/components/auth/form-message";
import { createProjectTask, updateTaskStatus } from "@/lib/actions/projects";
import { formatShortDate } from "@/lib/format";
import type { TaskRecord, TaskStatus } from "@/lib/data/operations";

const ROLES = ["Commercial", "Designer / Bureau d'étude", "Production", "Vernisseur", "Agent Montage"];
const TASK_STATUSES: TaskStatus[] = ["À faire", "En cours", "Terminée"];

const PRIORITY_BADGE: Record<string, "neutral" | "info" | "warning"> = {
  Basse: "neutral",
  Normale: "info",
  Haute: "warning",
};

function TaskStatusSelect({ taskId, projectId, status }: { taskId: string; projectId: string; status: TaskStatus }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function handleChange(value: string) {
    setPending(true);
    const result = await updateTaskStatus(taskId, projectId, value);
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <Select value={status} onValueChange={handleChange} disabled={pending}>
      <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
      <SelectContent>
        {TASK_STATUSES.map((s) => (
          <SelectItem key={s} value={s}>{s}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function AddTaskDialog({ projectRef, projectId }: { projectRef: string; projectId: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const result = await createProjectTask(projectRef, projectId, {
      title: form.get("title"),
      role: form.get("role"),
      dueDate: form.get("dueDate"),
      priority: form.get("priority"),
    });

    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("Tâche ajoutée");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setError(null); }}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          <Plus className="h-3.5 w-3.5" /> Ajouter une tâche
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nouvelle tâche</DialogTitle>
            <DialogDescription>Liée au projet {projectRef}.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-5 px-7 py-6">
            {error && <FormMessage>{error}</FormMessage>}
            <div className="flex flex-col gap-2">
              <Label htmlFor="task-title">Titre</Label>
              <Input id="task-title" name="title" placeholder="Ex : Lancer la découpe façades" required />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label>Rôle</Label>
                <Select name="role" defaultValue={ROLES[0]}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Priorité</Label>
                <Select name="priority" defaultValue="Normale">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Basse">Basse</SelectItem>
                    <SelectItem value="Normale">Normale</SelectItem>
                    <SelectItem value="Haute">Haute</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="task-due">Échéance</Label>
              <Input id="task-due" name="dueDate" type="date" required />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">Annuler</Button>
            </DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Ajout…" : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TasksTab({ projectRef, projectId, tasks }: { projectRef: string; projectId: string; tasks: TaskRecord[] }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <AddTaskDialog projectRef={projectRef} projectId={projectId} />
      </div>
      {tasks.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-muted">Aucune tâche pour ce projet.</p>
      ) : (
        <ul className="flex flex-col">
          {tasks.map((t) => (
            <li key={t.id} className="flex items-center gap-3 border-b border-border-subtle py-3.5 last:border-0">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text-primary">{t.title}</p>
                <p className="text-xs text-text-muted">{t.role} · échéance {formatShortDate(t.dueDate)}</p>
              </div>
              <Badge variant={PRIORITY_BADGE[t.priority]}>{t.priority}</Badge>
              <TaskStatusSelect taskId={t.id} projectId={projectId} status={t.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export { TasksTab };
