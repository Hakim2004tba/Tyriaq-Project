"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ReactNode } from "react";
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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { FormMessage } from "@/components/auth/form-message";
import { APPOINTMENT_TYPES, COMMERCIALS, DESIGNERS } from "@/lib/data/operations";
import { createAppointment, updateAppointment } from "@/lib/actions/appointments";
import type { AppointmentRecord } from "@/lib/data/operations";

export interface PersonOption {
  id: string;
  name: string;
  phone: string;
  email: string;
}

export interface ProjectOption {
  ref: string;
  label: string;
}

const REMINDER_OPTIONS = [
  { value: "none", label: "Aucun rappel" },
  { value: "30", label: "30 minutes avant" },
  { value: "60", label: "1 heure avant" },
  { value: "1440", label: "1 jour avant" },
];

function toDateTimeInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function AppointmentFormDialog({
  trigger,
  appointment,
  leads,
  clients,
  projects,
  lockedCommercial,
}: {
  trigger: ReactNode;
  appointment?: AppointmentRecord;
  leads: PersonOption[];
  clients: PersonOption[];
  projects: ProjectOption[];
  lockedCommercial?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [contact, setContact] = React.useState({
    name: appointment?.contactName ?? "",
    phone: appointment?.contactPhone ?? "",
    email: appointment?.contactEmail ?? "",
  });

  const isEdit = Boolean(appointment);

  function fillFromPerson(id: string, pool: PersonOption[]) {
    const person = pool.find((p) => p.id === id);
    if (person) {
      setContact({ name: person.name, phone: person.phone, email: person.email });
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const reminder = String(form.get("reminderMinutesBefore") ?? "none");

    const payload = {
      type: form.get("type"),
      title: form.get("title"),
      leadId: form.get("leadId"),
      clientId: form.get("clientId"),
      projectRef: form.get("projectRef"),
      contactName: form.get("contactName"),
      contactPhone: form.get("contactPhone"),
      contactEmail: form.get("contactEmail"),
      date: form.get("date"),
      durationMinutes: form.get("durationMinutes"),
      location: form.get("location"),
      commercial: form.get("commercial"),
      designer: form.get("designer"),
      notes: form.get("notes"),
      reminderMinutesBefore: reminder === "none" ? null : Number(reminder),
    };

    const result = isEdit ? await updateAppointment(appointment!.id, payload) : await createAppointment(payload);

    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    toast.success(isEdit ? "Rendez-vous mis à jour" : "Rendez-vous créé");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Modifier le rendez-vous" : "Nouveau rendez-vous"}</DialogTitle>
            <DialogDescription>
              Planifiez une consultation, une visite ou un appel, et reliez-le à un lead, un client ou un projet.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-5 px-7 py-6">
            {error && <FormMessage>{error}</FormMessage>}

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label>Type</Label>
                <Select name="type" defaultValue={appointment?.type ?? APPOINTMENT_TYPES[1]}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {APPOINTMENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="rdv-title">Titre</Label>
                <Input id="rdv-title" name="title" defaultValue={appointment?.title} placeholder="Ex : Présentation showroom" required />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label>Lead lié (optionnel)</Label>
                <Select
                  name="leadId"
                  defaultValue={appointment?.leadId ?? "none"}
                  onValueChange={(v) => v !== "none" && fillFromPerson(v, leads)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {leads.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Client lié (optionnel)</Label>
                <Select
                  name="clientId"
                  defaultValue={appointment?.clientId ?? "none"}
                  onValueChange={(v) => v !== "none" && fillFromPerson(v, clients)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Projet lié (optionnel)</Label>
              <Select name="projectRef" defaultValue={appointment?.projectRef ?? "none"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.ref} value={p.ref}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="rdv-contact-name">Nom du contact</Label>
                <Input
                  id="rdv-contact-name"
                  name="contactName"
                  value={contact.name}
                  onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="rdv-contact-phone">Téléphone</Label>
                <Input
                  id="rdv-contact-phone"
                  name="contactPhone"
                  value={contact.phone}
                  onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="rdv-contact-email">E-mail</Label>
                <Input
                  id="rdv-contact-email"
                  name="contactEmail"
                  type="email"
                  value={contact.email}
                  onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="rdv-date">Date et heure</Label>
                <Input
                  id="rdv-date"
                  name="date"
                  type="datetime-local"
                  defaultValue={appointment ? toDateTimeInputValue(appointment.date) : undefined}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="rdv-duration">Durée (minutes)</Label>
                <Input
                  id="rdv-duration"
                  name="durationMinutes"
                  type="number"
                  min={5}
                  max={480}
                  step={5}
                  defaultValue={appointment?.durationMinutes ?? 45}
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="rdv-location">Lieu</Label>
              <Input
                id="rdv-location"
                name="location"
                defaultValue={appointment?.location}
                placeholder="Ex : Atelier ART Cuisine — Alger"
                required
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label>Commercial responsable</Label>
                {lockedCommercial ? (
                  <>
                    <div className="flex h-11 items-center rounded-md border border-border-default bg-surface-sunken px-3.5 text-sm text-text-secondary">
                      {lockedCommercial}
                    </div>
                    <input type="hidden" name="commercial" value={lockedCommercial} />
                  </>
                ) : (
                  <Select name="commercial" defaultValue={appointment?.commercial ?? COMMERCIALS[0]}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COMMERCIALS.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label>Designer assigné (optionnel)</Label>
                <Select name="designer" defaultValue={appointment?.designer ?? "none"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {DESIGNERS.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Rappel</Label>
              <Select name="reminderMinutesBefore" defaultValue={appointment?.reminderMinutesBefore ? String(appointment.reminderMinutesBefore) : "none"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REMINDER_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="rdv-notes">Notes</Label>
              <Textarea id="rdv-notes" name="notes" defaultValue={appointment?.notes} placeholder="Contexte, objectif du rendez-vous…" />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">Annuler</Button>
            </DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer le rendez-vous"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { AppointmentFormDialog };
