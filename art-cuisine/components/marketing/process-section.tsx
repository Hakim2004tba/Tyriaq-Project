import { SectionHeading } from "@/components/ui/section-heading";

const STEPS = [
  { n: "01", title: "Conception", description: "Écoute de vos besoins et étude de votre espace." },
  { n: "02", title: "Fabrication", description: "Des matériaux sélectionnés et un travail de précision." },
  { n: "03", title: "Finition", description: "Des finitions soignées pour un rendu unique." },
  { n: "04", title: "Montage", description: "Une installation maîtrisée jusqu'au moindre détail." },
];

function ProcessSection() {
  return (
    <section id="process" className="bg-surface-raised">
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
          <SectionHeading
            kicker="Notre méthode"
            title="Une expertise de A à Z"
            description="De la conception à l'installation, nous vous accompagnons à chaque étape de votre projet. Notre équipe met tout son savoir-faire pour créer une cuisine qui vous ressemble."
          />

          <div className="relative grid grid-cols-2 gap-x-8 gap-y-12 sm:grid-cols-4">
            <div
              aria-hidden
              className="absolute left-0 right-0 top-[7px] hidden h-px bg-border-default sm:block"
            />
            {STEPS.map((step) => (
              <div key={step.n} className="relative">
                <span
                  aria-hidden
                  className="relative z-10 mb-4 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-accent ring-4 ring-surface-raised"
                />
                <span className="font-display text-sm text-text-accent">{step.n}</span>
                <h4 className="mt-2 text-sm font-semibold uppercase tracking-wider text-text-primary">
                  {step.title}
                </h4>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export { ProcessSection };
