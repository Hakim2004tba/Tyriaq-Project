import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/layout/logo";

function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-between px-6 py-10 sm:px-10 lg:px-16 lg:py-14">
        <Link href="/" className="inline-block">
          <Logo />
        </Link>

        <div className="mx-auto w-full max-w-sm py-12">
          <h1 className="font-display text-3xl font-medium text-text-primary">{title}</h1>
          <p className="mt-2.5 text-sm leading-relaxed text-text-secondary">{description}</p>
          <div className="mt-9">{children}</div>
        </div>

        <p className="text-center text-xs text-text-muted lg:text-left">
          {footer ?? (
            <>© {new Date().getFullYear()} ART Cuisine — Tous droits réservés.</>
          )}
        </p>
      </div>

      <div className="relative hidden overflow-hidden bg-ink-950 lg:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/kitchens/minerale.png" alt="" className="h-full w-full object-cover opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-ink-950/10" />
        <div className="absolute inset-0 flex flex-col justify-end p-16">
          <p className="font-display text-2xl italic leading-snug text-text-inverse">
            Une cuisine sur mesure n&rsquo;est pas un meuble que l&rsquo;on
            choisit — c&rsquo;est un espace de vie que l&rsquo;on dessine
            ensemble.
          </p>
          <span className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-gold-400">
            ART Cuisine — Cuisines sur mesure
          </span>
        </div>
      </div>
    </div>
  );
}

export { AuthShell };
