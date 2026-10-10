"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, AlertTriangle } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { FormMessage } from "@/components/auth/form-message";
import { reportProjectIssue, updateIssueStatus } from "@/lib/actions/projects";
import { formatShortDate } from "@/lib/format";
import type { ProjectIssueRecord, ProjectIssueStatus } from "@/lib/data/operations";

const ISSUE_STATUSES: ProjectIssueStatus[] = ["Ouvert", "En cours", "Résolu"];

const SEVERITY_BADGE: Record<string, "neutral" | "info" | "warning" | "danger"> = {
  Basse: "neutral",
  Normale: "info",
  Haute: "warning",
  Critique: "danger",
};

const STATUS_BADGE: Record<ProjectIssueStatus, "danger" | "warning" | "success"> = {
  Ouvert: "danger",
  "En cours": "warning",
  Résolu: "success",
};

function IssueStatusSelect({ issueId, projectId, status }: { issueId: string; projectId: string; status: ProjectIssueStatus }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function handleChange(value: string) {
    setPending(true);
    const result = await updateIssueStatus(issueId, projectId, value);
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <Select value={status} onValueChange={handleChange} disabled={pending}>
      <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
      <SelectContent>
        {ISSUE_STATUSES.map((s) => (
          <SelectItem key={s} value={s}>{s}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ReportIssueDialog({ projectRef, projectId }: { projectRef: string; projectId: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const result = await reportProjectIssue(projectRef, projectId, {
      title: form.get("title"),
      description: form.get("description"),
      severity: form.get("severity"),
    });

    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("Problème signalé");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setError(null); }}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          <Plus className="h-3.5 w-3.5" /> Signaler un problème
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Signaler un problème</DialogTitle>
            <DialogDescription>Lié au projet {projectRef}.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-5 px-7 py-6">
            {error && <FormMessage>{error}</FormMessage>}
            <div className="flex flex-col gap-2">
              <Label htmlFor="issue-title">Titre</Label>
              <Input id="issue-title" name="title" placeholder="Ex : Façade livrée rayée" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="issue-description">Description</Label>
              <Textarea id="issue-description" name="description" placeholder="Détaillez le problème constaté…" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Gravité</Label>
              <Select name="severity" defaultValue="Normale">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Basse">Basse</SelectItem>
                  <SelectItem value="Normale">Normale</SelectItem>
                  <SelectItem value="Haute">Haute</SelectItem>
                  <SelectItem value="Critique">Critique</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">Annuler</Button>
            </DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Envoi…" : "Signaler"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function IssuesTab({ projectRef, projectId, issues }: { projectRef: string; projectId: string; issues: ProjectIssueRecord[] }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <ReportIssueDialog projectRef={projectRef} projectId={projectId} />
      </div>
      {issues.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-muted">Aucun problème signalé pour ce projet.</p>
      ) : (
        <ul className="flex flex-col">
          {issues.map((i) => (
            <li key={i.id} className="flex items-start gap-3 border-b border-border-subtle py-3.5 last:border-0">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--status-warning-bg)] text-[var(--status-warning-fg)]">
                <AlertTriangle className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text-primary">{i.title}</p>
                <p className="text-xs text-text-muted">{i.description}</p>
                <p className="mt-1 text-xs text-text-muted">Signalé par {i.reportedBy} · {formatShortDate(i.createdAt)}</p>
              </div>
              <Badge variant={SEVERITY_BADGE[i.severity]}>{i.severity}</Badge>
              <Badge variant={STATUS_BADGE[i.status]}>{i.status}</Badge>
              <IssueStatusSelect issueId={i.id} projectId={projectId} status={i.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export { IssuesTab };
