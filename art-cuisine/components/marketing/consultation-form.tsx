"use client";

import * as React from "react";
import { toast } from "sonner";
import { Mail, Phone, User } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { requestConsultation } from "@/lib/actions/appointments";

function ConsultationForm() {
  const [submitting, setSubmitting] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const result = await requestConsultation({
      name: form.get("name"),
      phone: form.get("phone"),
      email: form.get("email"),
      format: form.get("format"),
      date: form.get("date"),
      slot: form.get("slot"),
      message: form.get("message"),
    });

    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success("Votre demande de consultation est envoyée", {
      description: "Notre équipe vous confirme le créneau sous 24 à 48h.",
    });
    formRef.current?.reset();
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="rounded-lg border border-border-subtle bg-surface-raised p-7 shadow-elevation-sm sm:p-9"
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="consult-name">Nom complet</Label>
          <Input id="consult-name" name="name" icon={<User />} placeholder="Votre nom" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="consult-phone">Téléphone</Label>
          <Input id="consult-phone" name="phone" icon={<Phone />} placeholder="+213 5 55 12 34 56" required />
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="consult-email">E-mail</Label>
          <Input id="consult-email" name="email" type="email" icon={<Mail />} placeholder="vous@exemple.com" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Format souhaité</Label>
          <Select name="format" defaultValue="atelier">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="atelier">En atelier</SelectItem>
              <SelectItem value="domicile">À domicile</SelectItem>
              <SelectItem value="visio">En visioconférence</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="consult-date">Date souhaitée</Label>
          <Input id="consult-date" name="date" type="date" />
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label>Créneau préféré</Label>
          <Select name="slot" defaultValue="matin">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="matin">Matin</SelectItem>
              <SelectItem value="apres-midi">Après-midi</SelectItem>
              <SelectItem value="soir">Fin de journée</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="consult-message">Votre projet en quelques mots</Label>
          <Textarea
            id="consult-message"
            name="message"
            placeholder="Type de cuisine, surface, style envisagé…"
          />
        </div>
      </div>

      <Button type="submit" variant="gold" size="lg" className="mt-7 w-full" disabled={submitting}>
        {submitting ? "Envoi en cours…" : "Réserver ma consultation"}
      </Button>
    </form>
  );
}

export { ConsultationForm };
