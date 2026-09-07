"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, Menu, X } from "lucide-react";
import { Button } from "@flow/ui";
import { cn } from "@flow/utils";

const LINKS = [
  { label: "Home", href: "#top" },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
];

/**
 * The marketing header.
 *
 * Sits over the hero rather than above it — the aurora runs behind the
 * bar, which is what stops the page starting with a hard horizontal edge
 * — and gains its own surface only once it is scrolled past, where it
 * would otherwise sit on top of content.
 */
export function MarketingNav({ signedIn = false }: { signedIn?: boolean }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  /*
    Transparent over the hero, glass once the page moves.

    A bar with its own surface at the very top draws a hard line across
    the aurora before the page has said anything; it only needs a
    background once there is content passing underneath it.
  */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-50">
      <div
        className={cn(
          "transition-colors duration-slow",
          scrolled || open ? "tq-glass border-b border-white/[0.06]" : "border-b border-transparent"
        )}
      >
        <nav className="mx-auto flex h-16 max-w-[1240px] items-center gap-6 px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 rounded focus-visible:outline-none focus-visible:shadow-focus"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-brand text-body-sm font-bold text-white">
              T
            </span>
            <span className="text-h4 font-semibold text-text-primary">tyriaq</span>
          </Link>

          <ul className="hidden flex-1 items-center gap-1 md:flex">
            {LINKS.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  className="rounded-md px-3 py-2 text-body-sm text-text-secondary transition-colors
                             duration-fast hover:text-text-primary focus-visible:outline-none focus-visible:shadow-focus"
                >
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <span className="flex cursor-default items-center gap-1 rounded-md px-3 py-2 text-body-sm text-text-secondary">
                Resources
                <ChevronDown className="size-3.5" aria-hidden="true" />
              </span>
            </li>
          </ul>

          <div className="ml-auto flex items-center gap-2 md:ml-0">
            {signedIn ? (
              <Button size="md" asChild className="hidden sm:inline-flex">
                <Link href="/dashboard">
                  Open Tyriaq
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button variant="secondary" size="md" asChild className="hidden sm:inline-flex">
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button size="md" asChild className="hidden sm:inline-flex">
                  <Link href="/signup">
                    Start free
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </>
            )}

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label={open ? "Close menu" : "Open menu"}
              className="flex size-9 items-center justify-center rounded-md text-text-secondary transition-colors
                         hover:bg-white/5 hover:text-text-primary focus-visible:outline-none focus-visible:shadow-focus md:hidden"
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </nav>
      </div>

      {/* The mobile sheet is part of the header rather than a portal: it
          pushes nothing, closes on any choice, and needs no focus trap. */}
      <div
        className={cn(
          "tq-glass overflow-hidden border-b border-white/[0.06] transition-[max-height] duration-slow md:hidden",
          open ? "max-h-80" : "max-h-0 border-b-0"
        )}
      >
        <ul className="mx-auto flex max-w-[1240px] flex-col gap-1 px-4 py-3 sm:px-6">
          {LINKS.map((link) => (
            <li key={link.label}>
              <a
                href={link.href}
                onClick={() => setOpen(false)}
                className="block rounded-md px-3 py-2 text-body-sm text-text-secondary transition-colors
                           hover:bg-white/5 hover:text-text-primary"
              >
                {link.label}
              </a>
            </li>
          ))}
          <li className="mt-1 flex gap-2">
            {signedIn ? (
              <Button size="md" asChild className="flex-1">
                <Link href="/dashboard">Open Tyriaq</Link>
              </Button>
            ) : (
              <>
                <Button variant="secondary" size="md" asChild className="flex-1">
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button size="md" asChild className="flex-1">
                  <Link href="/signup">Start free</Link>
                </Button>
              </>
            )}
          </li>
        </ul>
      </div>
    </header>
  );
}
