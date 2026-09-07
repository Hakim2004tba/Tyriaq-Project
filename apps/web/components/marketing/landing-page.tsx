import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  Check,
  CheckCircle2,
  Globe,
  Play,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@flow/ui";
import { AppPreview } from "./app-preview";
import { BoardPreview } from "./board-preview";
import { MarketingNav } from "./marketing-nav";

/**
 * The public front page.
 *
 * Built from the product's own design system — the same tokens, the same
 * aurora, the same brand gradient — so the marketing page and the
 * application look like one thing rather than two. The cosmic wash is
 * used ONCE, on the hero, per the rule the rest of the product follows.
 */

const FEATURES = [
  {
    icon: CheckCircle2,
    title: "Task management",
    body: "Structure the work with clear tasks, owners and priorities.",
  },
  {
    icon: Users,
    title: "Real-time collaboration",
    body: "Comment, mention and share files without leaving the task.",
  },
  {
    icon: CalendarClock,
    title: "Smart planning",
    body: "See deadlines coming, on a calendar and a timeline.",
  },
  {
    icon: BarChart3,
    title: "Project tracking",
    body: "Watch progress and keep control with live reporting.",
  },
  {
    icon: Zap,
    title: "One connected place",
    body: "Docs, chat and work in a single workspace, not five tabs.",
  },
];

const HERO_PROOF = ["No credit card", "Set up in two minutes", "Cancel any time"];

const TEAM_POINTS = [
  { icon: Sparkles, label: "Simple to use" },
  { icon: ShieldCheck, label: "Secure by default" },
  { icon: Globe, label: "Reachable anywhere" },
];

export function LandingPage({ signedIn = false }: { signedIn?: boolean }) {
  return (
    <div className="tq-aurora min-h-screen bg-background">
      <MarketingNav signedIn={signedIn} />

      {/* ------------------------------- hero ------------------------------ */}
      <section id="top" className="tq-cosmic relative overflow-hidden">
        {/*
          A faint starfield, drawn rather than loaded. Two radial-gradient
          layers at different scales read as depth without a background
          image, and they cost nothing to serve.
        */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.5]"
          style={{
            backgroundImage:
              "radial-gradient(1px 1px at 12% 22%, rgba(255,255,255,0.55), transparent), " +
              "radial-gradient(1px 1px at 78% 14%, rgba(255,255,255,0.45), transparent), " +
              "radial-gradient(1.5px 1.5px at 62% 46%, rgba(196,181,253,0.5), transparent), " +
              "radial-gradient(1px 1px at 34% 68%, rgba(255,255,255,0.35), transparent), " +
              "radial-gradient(1px 1px at 88% 62%, rgba(255,255,255,0.3), transparent), " +
              "radial-gradient(1px 1px at 22% 88%, rgba(196,181,253,0.35), transparent)",
          }}
        />

        <div className="mx-auto grid max-w-[1240px] items-center gap-10 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.18fr)] lg:gap-12 lg:px-8 lg:pb-28 lg:pt-24">
          <div className="flex min-w-0 flex-col items-start gap-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-1.5 text-caption text-text-secondary backdrop-blur">
              <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
              One platform. Every project.
            </span>

            <h1 className="text-balance text-[2.25rem] font-bold leading-[1.08] tracking-[-0.02em] text-text-primary sm:text-[3rem] lg:text-[3.25rem] xl:text-[3.5rem]">
              Tyriaq, the all‑in‑one platform for{" "}
              <span className="tq-gradient-text">limitless productivity.</span>
            </h1>

            <p className="max-w-xl text-body text-text-secondary sm:text-[1.0625rem] sm:leading-[1.7]">
              Organise your tasks, collaborate with your team, track your projects and reach your
              goals — all in the same place.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Button size="lg" asChild>
                <Link href={signedIn ? "/dashboard" : "/signup"}>
                  {signedIn ? "Open Tyriaq" : "Start for free"}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button variant="ghost" size="lg" asChild>
                <Link href={signedIn ? "/projects" : "/login"}>
                  <Play className="size-4" />
                  {signedIn ? "Go to your projects" : "See it live"}
                </Link>
              </Button>
            </div>

            {/* Signing-up reassurances are for people who have not signed
                up. Somebody already inside does not need to be told there
                is no credit card. */}
            <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
              {(signedIn ? [] : HERO_PROOF).map((item) => (
                <li key={item} className="flex items-center gap-2 text-caption text-text-muted">
                  <span
                    className="flex size-4 shrink-0 items-center justify-center rounded-full bg-primary-muted text-primary"
                    aria-hidden="true"
                  >
                    <Check className="size-2.5" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* The preview breaks the right margin on wide screens, which is
              what gives the section its sense of a window onto something
              larger rather than a framed picture. The glow behind it is a
              light source, not a decoration — it is what lifts the panel
              off the starfield. */}
          <div className="relative min-w-0 lg:-mr-16 xl:-mr-28">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -inset-x-10 -top-16 bottom-0 -z-10 rounded-full blur-3xl"
              style={{
                background:
                  "radial-gradient(60% 55% at 55% 30%, rgba(139,92,246,0.38), rgba(88,28,235,0.12) 55%, transparent 75%)",
              }}
            />
            <AppPreview />
          </div>
        </div>
      </section>

      {/* ----------------------------- features ---------------------------- */}
      <section id="features" className="border-y border-border bg-surface-muted/40">
        <ul className="mx-auto grid max-w-[1240px] gap-px px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-5 lg:px-8">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <li
                key={feature.title}
                /* Stacked on a phone the five would run to a screen and a
                   half of air, so they tighten and gain a rule between
                   them; on wide screens they become the row of columns
                   the design calls for. */
                className="flex flex-col items-center gap-2.5 border-t border-border px-4 py-7 text-center
                           first:border-t-0 sm:border-t-0 sm:py-9 lg:gap-3 lg:border-l lg:border-border lg:py-10 lg:first:border-l-0"
              >
                <span
                  className="flex size-11 items-center justify-center rounded-xl bg-primary-muted text-primary ring-1 ring-inset ring-primary/25"
                  aria-hidden="true"
                >
                  <Icon className="size-5" />
                </span>
                <h2 className="text-body font-medium text-text-primary">{feature.title}</h2>
                <p className="max-w-[16rem] text-body-sm leading-[1.6] text-text-muted">{feature.body}</p>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ------------------------------ teams ------------------------------ */}
      <section className="mx-auto grid max-w-[1240px] items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-14 lg:px-8 lg:py-24">
        <div className="order-2 min-w-0 lg:order-1 lg:-ml-10 xl:-ml-16">
          <BoardPreview />
        </div>

        <div className="order-1 flex min-w-0 flex-col items-start gap-5 lg:order-2">
          <p className="text-caption font-semibold uppercase tracking-[0.14em] text-text-muted">
            More than a tool, a partner
          </p>

          <h2 className="text-[1.75rem] font-bold leading-[1.15] tracking-[-0.015em] text-text-primary sm:text-[2.25rem]">
            Built for the teams that are{" "}
            <span className="tq-gradient-text">building what comes next.</span>
          </h2>

          <p className="max-w-xl text-body leading-[1.7] text-text-secondary">
            Whether you are a startup, an established company or a student team, Tyriaq keeps you
            organised, productive and aligned at every stage of the work.
          </p>

          <ul className="flex flex-wrap items-center gap-x-6 gap-y-3">
            {TEAM_POINTS.map((point) => {
              const Icon = point.icon;
              return (
                <li key={point.label} className="flex items-center gap-2 text-body-sm text-text-secondary">
                  <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
                  {point.label}
                </li>
              );
            })}
          </ul>

          <Button size="lg" asChild className="mt-1">
            <Link href={signedIn ? "/dashboard" : "/signup"}>
              {signedIn ? "Open Tyriaq" : "Start for free"}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* ------------------------------- cta ------------------------------- */}
      <section id="pricing" className="px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24">
        <div className="mx-auto flex max-w-[1240px] flex-col items-center gap-5 rounded-2xl border border-border bg-surface px-6 py-12 text-center shadow-card lg:py-16">
          <h2 className="max-w-2xl text-[1.5rem] font-bold leading-[1.2] tracking-[-0.015em] text-text-primary sm:text-[2rem]">
            Free while Tyriaq is in early access.
          </h2>
          <p className="max-w-xl text-body text-text-secondary">
            Every feature, no card, no seat limit. Bring your team across and tell us what is missing.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" asChild>
              <Link href={signedIn ? "/dashboard" : "/signup"}>
                {signedIn ? "Open your workspace" : "Create your workspace"}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            {!signedIn && (
              <Button variant="secondary" size="lg" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* ------------------------------ footer ----------------------------- */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-[1240px] flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-brand text-caption font-bold text-white">
              T
            </span>
            <span className="text-body-sm font-medium text-text-primary">tyriaq</span>
          </div>

          <p className="text-caption text-text-muted">
            © {new Date().getFullYear()} Tyriaq. One platform for tasks, projects, docs and goals.
          </p>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="rounded text-caption text-text-muted transition-colors hover:text-text-primary
                         focus-visible:outline-none focus-visible:shadow-focus"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded text-caption text-text-muted transition-colors hover:text-text-primary
                         focus-visible:outline-none focus-visible:shadow-focus"
            >
              Create an account
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
