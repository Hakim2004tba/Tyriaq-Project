"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  StickyNote,
  Phone,
  CalendarClock,
  CheckSquare,
  BellRing,
  Plus,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatRelativeTime, formatShortDate } from "@/lib/format";
import { addLeadInteraction, toggleInteractionDone } from "@/lib/actions/leads";
import { isFollowUpOverdue } from "@/lib/data/operations";
import type { LeadInteractionRecord, LeadInteractionType } from "@/lib/data/operations";

const TYPE_META: Record<LeadInteractionType, { label: string; icon: typeof StickyNote }> = {
  note: { label: "Note", icon: StickyNote },
  call: { label: "Appel", icon: Phone },
  appointment: { label: "Rendez-vous", icon: CalendarClock },
  task: { label: "Tâche", icon: CheckSquare },
  reminder: { label: "Rappel", icon: BellRing },
};

const CALL_OUTCOMES = ["Intéressé", "À rappeler", "Injoignable", "Pas intéressé"];

function InteractionComposer({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [type, setType] = React.useState<LeadInteractionType>("note");
  const [submitting, setSubmitting] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  const needsDueDate = type === "task" || type === "reminder" || type === "appointment";
  const isCall = type === "call";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    if (!title) return;

    setSubmitting(true);
    const result = await addLeadInteraction(leadId, {
      type,
      title,
      content: form.get("content"),
      dueDate: form.get("dueDate") || null,
      outcome: form.get("outcome") || null,
    });
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success("Ajouté au suivi du lead");
    formRef.current?.reset();
    setType("note");
    router.refresh();
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4 border-b border-border-subtle pb-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label>Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as LeadInteractionType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(TYPE_META).map(([value, meta]) => (
                <SelectItem key={value} value={value}>{meta.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="interaction-title">Titre</Label>
          <Input id="interaction-title" name="title" placeholder="Ex : Appel de qualification" required />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="interaction-content">Détails</Label>
        <Textarea id="interaction-content" name="content" placeholder="Notes, contexte, prochaine étape…" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {needsDueDate && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="interaction-due">
              {type === "appointment" ? "Date du rendez-vous" : "Date d'échéance"}
            </Label>
            <Input id="interaction-due" name="dueDate" type="datetime-local" />
          </div>
        )}
        {isCall && (
          <div className="flex flex-col gap-2">
            <Label>Résultat de l&rsquo;appel</Label>
            <Select name="outcome" defaultValue={CALL_OUTCOMES[0]}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CALL_OUTCOMES.map((o) => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <Button type="submit" size="sm" className="w-fit" disabled={submitting}>
        <Plus className="h-3.5 w-3.5" /> {submitting ? "Ajout…" : "Ajouter au suivi"}
      </Button>
    </form>
  );
}

function UpcomingItem({ item }: { item: LeadInteractionRecord }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const Icon = TYPE_META[item.type].icon;
  const overdue = isFollowUpOverdue(item.dueDate);

  async function handleToggle() {
    setPending(true);
    const result = await toggleInteractionDone(item.id);
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3 border-b border-border-subtle py-3 last:border-0">
      <Checkbox checked={item.completed} disabled={pending} onCheckedChange={handleToggle} />
      <Icon className="h-4 w-4 shrink-0 text-text-muted" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text-primary">{item.title}</p>
        <p className={cn("text-xs", overdue ? "font-medium text-[var(--status-danger-fg)]" : "text-text-muted")}>
          {item.dueDate && formatShortDate(item.dueDate)} · {TYPE_META[item.type].label}
        </p>
      </div>
    </div>
  );
}

function InteractionsTimeline({ interactions }: { interactions: LeadInteractionRecord[] }) {
  if (interactions.length === 0) {
    return <p className="py-10 text-center text-sm text-text-muted">Aucun suivi enregistré pour ce lead.</p>;
  }

  return (
    <ol className="flex flex-col">
      {interactions.map((item) => {
        const Icon = TYPE_META[item.type].icon;
        return (
          <li key={item.id} className="flex items-start gap-3 border-b border-border-subtle py-4 last:border-0">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-text-secondary">
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-text-primary">{item.title}</p>
                <Badge variant="outline">{TYPE_META[item.type].label}</Badge>
                {item.outcome && <Badge variant="info">{item.outcome}</Badge>}
                {item.completed && <Badge variant="success">Terminé</Badge>}
              </div>
              {item.content && <p className="mt-1 text-sm text-text-secondary">{item.content}</p>}
              {item.dueDate && (
                <p className="mt-1 text-xs text-text-muted">Échéance : {formatShortDate(item.dueDate)}</p>
              )}
              <p className="mt-1 text-xs text-text-muted">{item.createdBy}</p>
            </div>
            <span className="shrink-0 text-xs text-stone-400">{formatRelativeTime(item.createdAt)}</span>
          </li>
        );
      })}
    </ol>
  );
}

function LeadInteractionsPanel({
  leadId,
  interactions,
  upcoming,
}: {
  leadId: string;
  interactions: LeadInteractionRecord[];
  upcoming: LeadInteractionRecord[];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
      <div className="flex flex-col gap-6">
        {upcoming.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>À venir</CardTitle>
              <CardDescription>Tâches, rappels et rendez-vous en attente.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col p-0 px-6 pb-2">
              {upcoming.map((item) => (
                <UpcomingItem key={item.id} item={item} />
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Ajouter un suivi</CardTitle>
            <CardDescription>Note, appel, rendez-vous, tâche ou rappel.</CardDescription>
          </CardHeader>
          <CardContent>
            <InteractionComposer leadId={leadId} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historique</CardTitle>
          <CardDescription>Tout le suivi de ce lead, du plus récent au plus ancien.</CardDescription>
        </CardHeader>
        <CardContent>
          <InteractionsTimeline interactions={interactions} />
        </CardContent>
      </Card>
    </div>
  );
}

export { LeadInteractionsPanel };
