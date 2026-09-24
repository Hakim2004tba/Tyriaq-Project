import type { JSX, ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Wordmark } from "@flow/ui";

/**
 * Terms and privacy.
 *
 * Deliberately outside the application shell: somebody reads these
 * before they have an account, often from a payment provider's
 * compliance check, and a page that demands a session to show its own
 * terms is a page that fails that check.
 */
export default function LegalLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-[820px] items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="rounded focus-visible:outline-none focus-visible:shadow-focus">
            <Wordmark size={24} />
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded text-caption text-text-muted transition-colors
                       hover:text-text-primary focus-visible:outline-none focus-visible:shadow-focus"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Back to Tyriaq
          </Link>
        </div>
      </header>

      {/*
        `prose`-like spacing written out rather than pulled from a
        plugin: this is the only long-form text in the product, and a
        dependency for one page of headings and paragraphs is a poor
        trade.
      */}
      <main
        className="mx-auto max-w-[820px] px-4 py-10 sm:px-6
                   [&_h2]:mt-8 [&_h2]:text-h3 [&_h2]:text-text-primary
                   [&_h3]:mt-6 [&_h3]:text-body [&_h3]:font-medium [&_h3]:text-text-primary
                   [&_p]:mt-3 [&_p]:text-body-sm [&_p]:leading-relaxed [&_p]:text-text-secondary
                   [&_ul]:mt-3 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5
                   [&_li]:text-body-sm [&_li]:leading-relaxed [&_li]:text-text-secondary
                   [&_a]:text-primary [&_a]:underline"
      >
        {children}
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-[820px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-6 sm:px-6">
          <p className="text-caption text-text-muted">
            © {new Date().getFullYear()} Tyriaq
          </p>
          <Link href="/terms" className="text-caption text-text-muted hover:text-text-primary">
            Terms
          </Link>
          <Link href="/privacy" className="text-caption text-text-muted hover:text-text-primary">
            Privacy
          </Link>
        </div>
      </footer>
    </div>
  );
}
