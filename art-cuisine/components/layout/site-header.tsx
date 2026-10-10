"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet";
import { Logo } from "@/components/layout/logo";
import type { SessionUser } from "@/lib/auth/session";

const NAV_ITEMS = [
  { label: "Accueil", href: "/" },
  { label: "Nos cuisines", href: "/nos-cuisines" },
  { label: "Nos réalisations", href: "/realisations" },
  { label: "Nos matériaux", href: "/nos-materiaux" },
  { label: "Notre savoir-faire", href: "/savoir-faire" },
  { label: "À propos", href: "/a-propos" },
  { label: "Contact", href: "/contact" },
];

function SiteHeader({ user = null }: { user?: SessionUser | null }) {
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b transition-colors duration-300",
        scrolled
          ? "border-border-subtle bg-surface/90 backdrop-blur-md"
          : "border-transparent bg-surface",
      )}
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-10">
        <Logo />

        <div className="hidden items-center gap-10 xl:flex">
          <nav className="flex items-center gap-7">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap text-[0.8125rem] font-medium uppercase tracking-wider text-text-secondary transition-colors hover:text-text-primary"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-4">
            {user ? (
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard">
                  <LayoutDashboard className="h-4 w-4" /> Mon espace
                </Link>
              </Button>
            ) : (
              <>
                <Link
                  href="/login"
                  className="whitespace-nowrap text-[0.8125rem] font-medium uppercase tracking-wider text-text-secondary transition-colors hover:text-text-primary"
                >
                  Connexion
                </Link>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/devis" className="whitespace-nowrap">Demander un devis →</Link>
                </Button>
              </>
            )}
          </div>
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label="Ouvrir le menu"
              className="focus-ring flex h-10 w-10 items-center justify-center rounded-md text-text-primary xl:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="px-6 py-8">
            <Logo />
            <nav className="mt-10 flex flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-3 py-3 text-sm font-medium uppercase tracking-wider text-text-secondary transition-colors hover:bg-stone-100 hover:text-text-primary"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            {user ? (
              <Button variant="gold" className="mt-6" asChild>
                <Link href="/dashboard">Mon espace</Link>
              </Button>
            ) : (
              <div className="mt-6 flex flex-col gap-3">
                <Button variant="outline" asChild>
                  <Link href="/login">Connexion</Link>
                </Button>
                <Button variant="gold" asChild>
                  <Link href="/devis">Demander un devis</Link>
                </Button>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

export { SiteHeader };
