import { Compass, Hammer, Layers3, Lightbulb, Ruler, Wrench } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";

const DOMAINS = [
  {
    icon: Compass,
    title: "Design & agencement",
    description: "Plans 3D, circulation et ergonomie pensés pour votre usage réel.",
  },
  {
    icon: Ruler,
    title: "Menuiserie sur mesure",
    description: "Caissons, façades et rangements taillés au millimètre pour votre espace.",
  },
  {
    icon: Layers3,
    title: "Pierre & plans de travail",
    description: "Marbre, granit et quartz façonnés dans notre atelier de taille.",
  },
  {
    icon: Hammer,
    title: "Finitions & quincaillerie",
    description: "Laque, bois massif, métal brossé — un rendu impeccable à chaque détail.",
  },
  {
    icon: Lightbulb,
    title: "Domotique & éclairage",
    description: "Éclairage d'ambiance, prises intégrées et équipements connectés.",
  },
  {
    icon: Wrench,
    title: "Accompagnement projet",
    description: "Un interlocuteur unique du premier croquis à la pose finale.",
  },
];

function ExpertiseSection() {
  return (
    <section id="expertise" className="bg-surface-sunken">
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-28">
        <SectionHeading
          kicker="Notre expertise"
          title="Un savoir-faire complet, sous un même toit"
          description="De la conception à la pose, chaque corps de métier est maîtrisé en interne — pour une cohérence totale du projet."
        />

        <div className="mt-14 grid gap-px overflow-hidden rounded-lg border border-border-subtle bg-border-subtle sm:grid-cols-2 lg:grid-cols-3">
          {DOMAINS.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="group flex flex-col gap-4 bg-surface-raised p-7 transition-colors duration-300 hover:bg-surface"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-md bg-surface-sunken text-accent-strong transition-colors group-hover:bg-ink-950 group-hover:text-gold-400">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-text-primary">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">
                  {description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export { ExpertiseSection };
