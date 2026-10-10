import { BadgeCheck, HeadphonesIcon, Truck, Wallet } from "lucide-react";
import { Reveal } from "@/components/site/reveal";

const FEATURES = [
  { icon: BadgeCheck, title: "Produits authentiques", text: "Qualité garantie sur chaque article" },
  { icon: Truck, title: "Livraison rapide", text: "Partout en Algérie" },
  { icon: Wallet, title: "Paiement à la livraison", text: "Simple et sécurisé" },
  { icon: HeadphonesIcon, title: "Service client", text: "Une équipe à votre écoute" },
];

export function Features() {
  return (
    <section className="border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 80}>
              <div className="group nb-card glow-border flex flex-col items-center gap-3 p-6 text-center transition-transform duration-300 hover:-translate-y-1">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 transition-transform duration-300 group-hover:scale-110 group-hover:bg-accent/20">
                  <f.icon className="h-6 w-6 text-accent-strong" />
                </div>
                <p className="text-sm font-bold">{f.title}</p>
                <p className="text-xs text-muted">{f.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
