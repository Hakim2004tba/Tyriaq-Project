"use client";

import * as React from "react";
import { toast } from "sonner";
import { Mail, MapPin, Phone } from "lucide-react";
import { Kicker } from "@/components/ui/section-heading";
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

const CONTACT_POINTS = [
  {
    icon: MapPin,
    label: "Atelier & showroom",
    value: "12 rue des Frères Bouadou, Alger",
  },
  {
    icon: Phone,
    label: "Téléphone",
    value: "+213 5 55 12 34 56",
  },
  {
    icon: Mail,
    label: "E-mail",
    value: "contact@art-cuisine.dz",
  },
];

function ContactSection() {
  const [submitting, setSubmitting] = React.useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    window.setTimeout(() => {
      setSubmitting(false);
      toast.success("Votre demande a bien été envoyée", {
        description: "Notre équipe vous recontacte sous 24 à 48h.",
      });
      event.currentTarget.reset();
    }, 700);
  }

  return (
    <section id="contact" className="bg-surface">
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-28">
        <div className="grid gap-16 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div>
            <Kicker>Contact</Kicker>
            <h2 className="mt-5 font-display text-3xl font-medium leading-[1.15] text-text-primary sm:text-4xl">
              Parlons de votre projet
            </h2>
            <p className="mt-5 max-w-sm text-[0.9375rem] leading-relaxed text-text-secondary">
              Une question, un plan à commenter, une visite d&rsquo;atelier à
              organiser ? Notre équipe vous répond personnellement.
            </p>

            <ul className="mt-10 flex flex-col gap-6">
              {CONTACT_POINTS.map(({ icon: Icon, label, value }) => (
                <li key={label} className="flex items-start gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border-default text-accent-strong">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                      {label}
                    </p>
                    <p className="mt-1 text-sm font-medium text-text-primary">{value}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-lg border border-border-subtle bg-surface-raised p-7 shadow-elevation-sm sm:p-9"
          >
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="contact-name">Nom complet</Label>
                <Input id="contact-name" name="name" placeholder="Votre nom" required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="contact-phone">Téléphone</Label>
                <Input id="contact-phone" name="phone" placeholder="+213 5 55 12 34 56" required />
              </div>
              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label htmlFor="contact-email">E-mail</Label>
                <Input id="contact-email" name="email" type="email" placeholder="vous@exemple.com" required />
              </div>
              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label>Type de projet</Label>
                <Select name="project-type" defaultValue="cuisine-complete">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cuisine-complete">Cuisine complète</SelectItem>
                    <SelectItem value="renovation">Rénovation de cuisine</SelectItem>
                    <SelectItem value="ilot">Îlot central seul</SelectItem>
                    <SelectItem value="autre">Autre projet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label htmlFor="contact-message">Votre projet</Label>
                <Textarea
                  id="contact-message"
                  name="message"
                  placeholder="Décrivez votre espace, vos envies, vos délais…"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="mt-7 w-full sm:w-auto"
              disabled={submitting}
            >
              {submitting ? "Envoi en cours…" : "Envoyer ma demande"}
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}

export { ContactSection };
