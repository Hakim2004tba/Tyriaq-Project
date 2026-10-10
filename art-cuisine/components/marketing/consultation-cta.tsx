import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";

function ConsultationCta() {
  return (
    <section className="bg-surface-sunken">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
        <div className="flex flex-col items-start justify-between gap-8 rounded-lg border border-border-subtle bg-surface-raised px-8 py-10 shadow-elevation-sm lg:flex-row lg:items-center lg:px-12">
          <div className="flex items-start gap-5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border-default text-accent-strong">
              <CalendarClock className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-display text-xl font-medium text-text-primary">
                Visitez notre atelier
              </h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-text-secondary">
                Prenez rendez-vous avec l&rsquo;un de nos designers pour
                découvrir nos matériaux, nos finitions et échanger sur votre
                projet — sans engagement.
              </p>
            </div>
          </div>
          <Button variant="outline" size="lg" className="w-full shrink-0 lg:w-auto" asChild>
            <Link href="/consultation">Prendre rendez-vous</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

export { ConsultationCta };
