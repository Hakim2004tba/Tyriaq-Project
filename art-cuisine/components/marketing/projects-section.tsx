"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { Kicker } from "@/components/ui/section-heading";
import { cn } from "@/lib/utils";
import { PROJECTS } from "@/lib/data/projects";

/** Reuses the same style photos as /nos-cuisines and the portfolio gallery — keyed by slug so each card shows its own project's style. */
const PROJECT_IMAGES: Record<string, string> = {
  "villa-belkacem": "/images/kitchens/epuree.webp",
  "residence-amina": "/images/kitchens/contemporaine.webp",
  "maison-moderne": "/images/kitchens/naturelle.webp",
  "appartement-city": "/images/kitchens/minerale.png",
  "villa-les-pins": "/images/kitchens/traditionnelle.webp",
  "residence-horizon": "/images/kitchens/industrielle.webp",
  "appartement-oran": "/images/kitchens/contemporaine.webp",
  "maison-el-amel": "/images/kitchens/naturelle.webp",
};

const PAGE_SIZE = 4;
const PAGES = Array.from({ length: Math.ceil(PROJECTS.length / PAGE_SIZE) }, (_, i) =>
  PROJECTS.slice(i * PAGE_SIZE, i * PAGE_SIZE + PAGE_SIZE),
);

function ProjectsSection() {
  const [page, setPage] = React.useState(0);
  const [visible, setVisible] = React.useState(true);

  function go(direction: 1 | -1) {
    setVisible(false);
    window.setTimeout(() => {
      setPage((p) => (p + direction + PAGES.length) % PAGES.length);
      setVisible(true);
    }, 220);
  }

  return (
    <section id="realisations" className="bg-grain bg-grain-dark bg-ink-950">
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-28">
        <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-end">
          <div className="max-w-lg">
            <Kicker>Nos réalisations</Kicker>
            <h2 className="mt-5 font-display text-3xl font-medium leading-[1.15] text-text-inverse sm:text-4xl">
              Des projets qui{" "}
              <span className="italic text-gold-400">inspirent</span>
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-text-inverse-muted">
              Chaque cuisine est une histoire, un style, une émotion.
              Découvrez nos réalisations et la diversité de nos créations sur
              mesure.
            </p>
            <Link
              href="/realisations"
              className="mt-7 inline-flex items-center gap-1.5 text-sm font-semibold text-gold-400 transition-opacity hover:opacity-70"
            >
              Voir tous les projets <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          {PAGES.length > 1 && (
            <div className="hidden items-center gap-2 lg:flex">
              <button
                type="button"
                aria-label="Projets précédents"
                onClick={() => go(-1)}
                className="focus-ring flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-white transition-colors hover:border-gold-400 hover:text-gold-400"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Projets suivants"
                onClick={() => go(1)}
                className="focus-ring flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-white transition-colors hover:border-gold-400 hover:text-gold-400"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        <div
          className={cn(
            "mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4",
            "transition-all duration-300 ease-[var(--ease-editorial)]",
            visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
          )}
        >
          {PAGES[page].map((p) => (
            <Link
              key={p.slug}
              href={`/realisations/${p.slug}`}
              className="group focus-ring block overflow-hidden rounded-md border border-white/10"
            >
              <div className="relative aspect-[4/5] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={PROJECT_IMAGES[p.slug]}
                  alt={p.title}
                  className="h-full w-full object-cover transition-transform duration-700 ease-[var(--ease-editorial)] group-hover:scale-[1.06]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 via-ink-950/0 to-transparent" />
              </div>
              <div className="bg-ink-900 px-4 py-3.5">
                <p className="text-sm font-semibold uppercase tracking-wider text-white">
                  {p.category}
                </p>
                <p className="mt-0.5 text-xs text-stone-400">{p.title}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export { ProjectsSection };
