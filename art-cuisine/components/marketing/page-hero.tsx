import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Kicker } from "@/components/ui/section-heading";

export interface PageHeroProps {
  kicker: string;
  title: ReactNode;
  description?: string;
  breadcrumb?: { label: string; href?: string }[];
}

function PageHero({ kicker, title, description, breadcrumb }: PageHeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-border-subtle">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(60%_50%_at_80%_0%,var(--stone-150)_0%,transparent_70%)]" />

      <div className="mx-auto max-w-7xl px-6 pb-16 pt-14 lg:px-10 lg:pt-20">
        {breadcrumb && (
          <nav className="mb-8 flex items-center gap-1.5 text-xs text-text-muted" aria-label="Fil d'Ariane">
            <Link href="/" className="transition-colors hover:text-text-primary">
              Accueil
            </Link>
            {breadcrumb.map((crumb) => (
              <span key={crumb.label} className="flex items-center gap-1.5">
                <ChevronRight className="h-3 w-3" />
                {crumb.href ? (
                  <Link href={crumb.href} className="transition-colors hover:text-text-primary">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-text-secondary">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}

        <Kicker>{kicker}</Kicker>
        <h1 className="mt-5 max-w-3xl font-display text-4xl font-medium leading-[1.1] text-text-primary sm:text-5xl">
          {title}
        </h1>
        {description && (
          <p className="mt-6 max-w-xl text-[0.9375rem] leading-relaxed text-text-secondary">
            {description}
          </p>
        )}
      </div>
    </section>
  );
}

export { PageHero };
