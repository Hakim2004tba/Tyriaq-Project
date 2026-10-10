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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { FormMessage } from "@/components/auth/form-message";
import { createStaffConversation } from "@/lib/actions/conversations";

interface StaffOption {
  email: string;
  name: string;
}

function NewStaffConversationDialog({ staffDirectory, currentEmail }: { staffDirectory: StaffOption[]; currentEmail: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [type, setType] = React.useState<"internal" | "project">("internal");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  const others = staffDirectory.filter((s) => s.email.toLowerCase() !== currentEmail.toLowerCase());

  function toggle(email: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const result = await createStaffConversation({
      type,
      title: form.get("title"),
      projectRef: type === "project" ? form.get("projectRef") : null,
      participantEmails: Array.from(selected),
      content: form.get("content"),
    });

    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("Conversation créée");
    setOpen(false);
    router.push(`/dashboard/messagerie/${result.data.id}`);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) { setError(null); setSelected(new Set()); } }}>
      <DialogTrigger asChild>
        <Button type="button">
          <Plus className="h-4 w-4" /> Nouvelle conversation
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nouvelle conversation</DialogTitle>
            <DialogDescription>Interne à l&rsquo;équipe, ou liée à un projet.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-5 px-7 py-6">
            {error && <FormMessage>{error}</FormMessage>}

            <div className="flex flex-col gap-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as "internal" | "project")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">Équipe interne</SelectItem>
                  <SelectItem value="project">Projet</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="new-staff-conv-title">Titre</Label>
              <Input id="new-staff-conv-title" name="title" placeholder="Ex : Coordination Villa Benali" required />
            </div>

            {type === "project" && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="new-staff-conv-ref">Référence projet</Label>
                <Input id="new-staff-conv-ref" name="projectRef" placeholder="Ex : PROJ-2025-041" />
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label>Participants</Label>
              <div className="flex max-h-40 flex-col gap-2 overflow-y-auto rounded-md border border-border-subtle p-3">
                {others.map((s) => (
                  <label key={s.email} className="flex items-center gap-2.5 text-sm">
                    <Checkbox checked={selected.has(s.email)} onCheckedChange={() => toggle(s.email)} />
                    {s.name}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="new-staff-conv-content">Premier message</Label>
              <Textarea id="new-staff-conv-content" name="content" placeholder="Votre message…" required minLength={1} className="min-h-20" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">Annuler</Button>
            </DialogClose>
            <Button type="submit" disabled={submitting || selected.size === 0}>
              {submitting ? "Création…" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { NewStaffConversationDialog };
