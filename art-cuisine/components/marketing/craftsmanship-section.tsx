import { Kicker } from "@/components/ui/section-heading";

const STATS = [
  { value: "15", suffix: "ans", label: "D'expérience artisanale" },
  { value: "500", suffix: "+", label: "Cuisines livrées" },
  { value: "12", suffix: "", label: "Artisans en atelier" },
  { value: "5", suffix: "ans", label: "Garantie constructeur" },
];

function CraftsmanshipSection() {
  return (
    <section id="qualite" className="relative overflow-hidden bg-surface-raised">
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-28">
        <div className="grid gap-14 lg:grid-cols-[1fr_1fr] lg:gap-20">
          <div>
            <Kicker>Qualité &amp; savoir-faire</Kicker>
            <h2 className="mt-5 font-display text-3xl font-medium leading-[1.15] text-text-primary sm:text-4xl">
              Le geste juste, à chaque étape
            </h2>
            <p className="mt-6 max-w-md text-[0.9375rem] leading-relaxed text-text-secondary">
              Nos artisans travaillent le bois, la pierre et le métal avec la
              même exigence : des assemblages soignés, des chants irréprochables,
              des mécanismes testés un à un avant la pose. La qualité ne se
              négocie pas — elle se construit, geste après geste.
            </p>
            <div className="mt-8 flex items-center gap-3 rounded-md border border-border-subtle bg-surface-sunken px-5 py-4">
              <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />
              <p className="text-xs leading-relaxed text-text-muted">
                Chaque cuisine est contrôlée en atelier avant expédition, puis
                réceptionnée avec vous lors de la pose.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border-subtle bg-border-subtle">
            {STATS.map((s) => (
              <div key={s.label} className="bg-surface-raised px-6 py-8">
                <p className="font-display text-4xl text-text-primary">
                  {s.value}
                  <span className="text-text-accent">{s.suffix}</span>
                </p>
                <p className="mt-2 text-xs leading-snug text-text-muted">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="h-3 w-full bg-[linear-gradient(90deg,var(--stone-300)_0%,var(--gold-400)_50%,var(--stone-300)_100%)] opacity-70" />
    </section>
  );
}

export { CraftsmanshipSection };
