import Link from "next/link";
import { ArrowRight, Flame } from "lucide-react";
import { Reveal } from "@/components/site/reveal";

export function PromoBanner() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <Reveal>
        <div className="grid grid-cols-1 overflow-hidden rounded-2xl border border-border lg:grid-cols-2">
          <div className="relative flex flex-col justify-center gap-4 bg-surface-2 p-10 sm:p-14">
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: "radial-gradient(circle at 20% 30%, rgba(57,255,138,0.18), transparent 60%)",
              }}
            />
            <span className="relative inline-flex w-fit items-center gap-2 rounded-full bg-accent/15 px-3 py-1 text-xs font-bold text-accent-strong">
              <Flame className="h-3.5 w-3.5" /> Offre limitée
            </span>
            <h2 className="relative text-3xl font-black leading-tight sm:text-4xl">
              JUSQU&apos;À <span className="glow-text text-accent-strong">-50%</span>
              <br />
              sur une sélection de produits sportifs
            </h2>
            <p className="relative max-w-md text-sm text-muted">
              Équipements, chaussures et vêtements techniques à prix réduits, pour une durée limitée.
            </p>
            <Link
              href="/promotions"
              className="group relative inline-flex h-12 w-fit items-center gap-2 rounded-xl nb-gradient-accent px-6 text-sm font-bold text-accent-foreground transition-all hover:brightness-110"
            >
              Découvrir maintenant
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          <div className="relative flex items-center justify-center overflow-hidden bg-background p-10">
            <div className="nb-noise absolute inset-0" />
            <div className="nb-float relative flex h-48 w-48 items-center justify-center rounded-full bg-accent/10">
              <span className="text-5xl font-black text-accent-strong glow-text">-50%</span>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
