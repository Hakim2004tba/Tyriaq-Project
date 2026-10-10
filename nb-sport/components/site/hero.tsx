"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Activity, ShieldCheck, Truck, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const PERKS = [
  { icon: ShieldCheck, title: "Qualité garantie", text: "Produits 100% authentiques" },
  { icon: Truck, title: "Livraison rapide", text: "Partout en Algérie" },
  { icon: Wallet, title: "Paiement à la livraison", text: "Simple et sécurisé" },
];

export function Hero() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 60);
    return () => clearTimeout(t);
  }, []);

  return (
    <section className="relative overflow-hidden border-b border-border bg-background">
      <div className="pointer-events-none absolute inset-0 nb-noise" />
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-40"
        viewBox="0 0 1200 600"
        preserveAspectRatio="none"
      >
        <line x1="750" y1="0" x2="1200" y2="420" stroke="var(--accent)" strokeWidth="1.5" strokeOpacity="0.25" />
        <line x1="880" y1="0" x2="1200" y2="280" stroke="var(--accent)" strokeWidth="1" strokeOpacity="0.18" />
        <line x1="1000" y1="0" x2="1200" y2="150" stroke="var(--accent)" strokeWidth="1" strokeOpacity="0.15" />
      </svg>

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-24 lg:px-8">
        <div
          className={cn(
            "transition-all duration-700 ease-out",
            loaded ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
          )}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-accent-strong/40 bg-accent/10 px-3.5 py-1.5 text-xs font-semibold text-accent-strong">
            <Activity className="h-3.5 w-3.5" /> Nouvelle collection disponible
          </span>
          <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            PERFORMEZ
            <br />
            <span className="glow-text text-accent-strong">À CHAQUE MOUVEMENT</span>
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-muted sm:text-lg">
            Découvrez notre sélection de produits sportifs conçus pour accompagner votre
            performance : chaussures, vêtements, équipements et accessoires premium.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/produits"
              className="group inline-flex h-12 items-center gap-2 rounded-xl nb-gradient-accent px-6 text-sm font-bold text-accent-foreground transition-all hover:brightness-110 hover:shadow-[0_0_32px_rgba(57,255,138,0.4)]"
            >
              Découvrir la collection
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/promotions"
              className="inline-flex h-12 items-center rounded-xl border border-border px-6 text-sm font-semibold transition-colors hover:border-accent-strong hover:text-accent-strong"
            >
              Voir les promotions
            </Link>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {PERKS.map((perk) => (
              <div key={perk.title} className="nb-card flex items-start gap-3 p-3.5">
                <perk.icon className="h-5 w-5 shrink-0 text-accent-strong" />
                <div>
                  <p className="text-xs font-bold">{perk.title}</p>
                  <p className="text-[11px] text-muted">{perk.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          className={cn(
            "relative mx-auto aspect-[4/5] w-full max-w-md transition-all duration-700 ease-out",
            loaded ? "scale-100 opacity-100" : "scale-95 opacity-0"
          )}
        >
          <div className="nb-float absolute inset-0 rounded-[2rem] nb-card glow-border overflow-hidden">
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at 30% 20%, rgba(57,255,138,0.22), transparent 55%), radial-gradient(circle at 80% 80%, rgba(57,255,138,0.12), transparent 50%)",
              }}
            />
            <div className="relative flex h-full flex-col items-center justify-center gap-6 p-8">
              <div className="nb-pulse-glow flex h-40 w-40 items-center justify-center rounded-full bg-accent/10">
                <Activity className="h-20 w-20 text-accent-strong" strokeWidth={1.1} />
              </div>
              <div className="text-center">
                <p className="text-2xl font-black">NB SPORT</p>
                <p className="text-xs uppercase tracking-[0.3em] text-muted">Performance totale</p>
              </div>
            </div>
            <div className="nb-scan absolute inset-0" />
          </div>
          <div className="absolute -bottom-6 -left-6 h-28 w-28 rounded-2xl bg-accent/15 blur-3xl" />
        </div>
      </div>
    </section>
  );
}
