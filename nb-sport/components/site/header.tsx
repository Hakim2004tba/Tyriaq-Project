"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Heart, Menu, Search, ShoppingCart, User, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCart } from "@/lib/store/cart";
import { ThemeToggle } from "@/components/site/theme-toggle";

const NAV = [
  { href: "/", label: "Accueil" },
  { href: "/produits", label: "Produits" },
  { href: "/categories", label: "Catégories" },
  { href: "/promotions", label: "Promotions" },
  { href: "/nouveautes", label: "Nouveautés" },
  { href: "/suivre-commande", label: "Suivre ma commande" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const count = useCart((s) => s.count());
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(query.trim() ? `/produits?q=${encodeURIComponent(query.trim())}` : "/produits");
    setMenuOpen(false);
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b border-transparent transition-all duration-300",
        scrolled ? "glow-border border-border bg-background/85 backdrop-blur-md" : "bg-background"
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-lg nb-gradient-accent font-black text-accent-foreground">
            NB
          </span>
          <span className="text-lg font-black tracking-tight">
            NB <span className="text-accent-strong glow-text">SPORT</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-muted transition-colors hover:text-accent-strong"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <form onSubmit={submitSearch} className="ml-auto hidden flex-1 max-w-sm items-center md:flex">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un produit..."
              className="h-10 w-full rounded-lg border border-border bg-surface-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-accent-strong"
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <Link
            href="/compte"
            className="hidden h-10 w-10 items-center justify-center rounded-lg transition-colors hover:bg-surface-2 hover:text-accent-strong sm:flex"
            aria-label="Mon compte"
          >
            <User className="h-5 w-5" />
          </Link>
          <Link
            href="/compte?tab=favoris"
            className="hidden h-10 w-10 items-center justify-center rounded-lg transition-colors hover:bg-surface-2 hover:text-accent-strong sm:flex"
            aria-label="Favoris"
          >
            <Heart className="h-5 w-5" />
          </Link>
          <Link
            href="/panier"
            className="relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:bg-surface-2 hover:text-accent-strong"
            aria-label="Panier"
          >
            <ShoppingCart className="h-5 w-5" />
            {mounted && count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
                {count}
              </span>
            )}
          </Link>
          <ThemeToggle className="hidden sm:inline-flex" />
          <button
            type="button"
            className="ml-1 flex h-10 w-10 items-center justify-center rounded-lg hover:bg-surface-2 lg:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div
        className={cn(
          "overflow-hidden border-t border-border bg-background transition-[max-height,opacity] duration-300 lg:hidden",
          menuOpen ? "max-h-[28rem] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="flex flex-col gap-1 px-4 py-4">
          <form onSubmit={submitSearch} className="relative mb-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher..."
              className="h-10 w-full rounded-lg border border-border bg-surface-2 pl-9 pr-3 text-sm outline-none focus:border-accent-strong"
            />
          </form>
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-surface-2 hover:text-accent-strong"
            >
              {item.label}
            </Link>
          ))}
          <div className="mt-2 flex items-center justify-between px-3">
            <span className="text-sm text-muted">Thème</span>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
