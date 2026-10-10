import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Clock } from "lucide-react";
import { ContactSection } from "@/components/marketing/contact-section";
import { Kicker } from "@/components/ui/section-heading";

export const metadata: Metadata = {
  title: "Contact — ART Cuisine",
  description: "Contactez l'équipe ART Cuisine pour toute question sur votre projet de cuisine sur mesure.",
};

const HOURS = [
  { day: "Dimanche — Jeudi", hours: "9h00 — 18h00" },
  { day: "Vendredi", hours: "Fermé" },
  { day: "Samedi", hours: "9h00 — 13h00" },
];

export default function ContactPage() {
  return (
    <>
      <ContactSection />

      <section className="border-t border-border-subtle bg-surface-sunken">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[1fr_1fr] lg:items-center lg:px-10">
          <div className="relative aspect-[4/2.4] overflow-hidden rounded-lg border border-border-subtle shadow-elevation-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/kitchens/contemporaine.webp" alt="Atelier ART Cuisine" className="h-full w-full object-cover" />
          </div>

          <div>
            <Kicker>Horaires d&rsquo;atelier</Kicker>
            <h2 className="mt-5 font-display text-2xl font-medium text-text-primary sm:text-3xl">
              Nous accueillir en atelier
            </h2>
            <ul className="mt-6 flex flex-col gap-3">
              {HOURS.map((h) => (
                <li key={h.day} className="flex items-center justify-between border-b border-border-subtle pb-3 text-sm">
                  <span className="flex items-center gap-2 text-text-secondary">
                    <Clock className="h-4 w-4 text-text-muted" /> {h.day}
                  </span>
                  <span className="font-medium text-text-primary">{h.hours}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/faq"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-text-accent hover:opacity-70"
            >
              Consulter la FAQ <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
