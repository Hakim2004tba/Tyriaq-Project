"use client";

import { useState } from "react";
import { Mail, MapPin, Phone, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ContactPage() {
  const [sent, setSent] = useState(false);

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-black">Contactez-nous</h1>
      <p className="mt-2 text-sm text-muted">Une question ? Notre équipe vous répond rapidement.</p>

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.2fr]">
        <div className="flex flex-col gap-4">
          <div className="nb-card flex items-center gap-3 p-4">
            <MapPin className="h-5 w-5 text-accent-strong" />
            <span className="text-sm">Alger, Algérie</span>
          </div>
          <div className="nb-card flex items-center gap-3 p-4">
            <Phone className="h-5 w-5 text-accent-strong" />
            <span className="text-sm">+213 555 00 00 00</span>
          </div>
          <div className="nb-card flex items-center gap-3 p-4">
            <Mail className="h-5 w-5 text-accent-strong" />
            <span className="text-sm">contact@nbsport.dz</span>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSent(true);
          }}
          className="nb-card glow-border flex flex-col gap-3 p-6"
        >
          {sent ? (
            <p className="py-10 text-center text-sm font-semibold text-accent-strong">
              Merci, votre message a bien été envoyé !
            </p>
          ) : (
            <>
              <input
                required
                placeholder="Nom complet"
                className="h-11 rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-accent-strong"
              />
              <input
                required
                type="email"
                placeholder="Adresse e-mail"
                className="h-11 rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-accent-strong"
              />
              <textarea
                required
                rows={5}
                placeholder="Votre message"
                className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent-strong"
              />
              <Button type="submit" className="mt-2">
                <Send className="h-4 w-4" /> Envoyer le message
              </Button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
