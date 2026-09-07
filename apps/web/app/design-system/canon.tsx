"use client";

import { useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  Calendar,
  CheckSquare,
  Flag,
  MoreHorizontal,
  Paperclip,
  Plus,
  Search,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import {
  Avatar,
  AvatarGroup,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  IconButton,
  Input,
  Kbd,
  Progress,
  ProgressRing,
  StatCard,
  StatusDot,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@flow/ui";

/* ------------------------------------------------------------------ */
/* Page scaffolding                                                     */
/* ------------------------------------------------------------------ */

function Section({
  id,
  title,
  rule,
  children,
}: {
  id: string;
  title: string;
  /** The governing rule. Every section states one — a design system
   * that only shows specimens gets applied inconsistently. */
  rule: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-5">
        <h2 className="text-h2 text-text-primary">{title}</h2>
        <p className="mt-1.5 max-w-3xl text-body text-text-secondary">{rule}</p>
      </div>
      {children}
    </section>
  );
}

function Specimen({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-overline uppercase text-text-muted">{label}</p>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Colour                                                               */
/* ------------------------------------------------------------------ */

function Swatch({ name, value, hex, note }: { name: string; value: string; hex?: string; note?: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        className="size-11 shrink-0 rounded-md border border-border shadow-rim"
        style={{ background: value }}
        aria-hidden="true"
      />
      <div className="min-w-0">
        <p className="truncate text-body-sm font-medium text-text-primary">{name}</p>
        <p className="truncate font-mono text-caption tabular text-text-muted">{hex ?? value}</p>
        {note && <p className="truncate text-caption text-text-muted">{note}</p>}
      </div>
    </div>
  );
}

const SURFACES = [
  { name: "background", value: "#0C0819", note: "the canvas" },
  { name: "sidebar", value: "#0A0616", note: "chrome, one step darker" },
  { name: "surface", value: "#130E24", note: "cards, panels" },
  { name: "surface-elevated", value: "#1A1330", note: "popovers, modals" },
  { name: "surface-muted", value: "#100B20", note: "recessed wells, inputs" },
];

const BRAND = [
  { name: "primary", value: "#8B5CF6", note: "accent · text & icons on dark" },
  { name: "primary-hover", value: "#A78BFA", note: "hover" },
  { name: "primary-active", value: "#7C3AED", note: "pressed" },
  { name: "primary-muted", value: "rgba(139,92,246,0.18)", hex: "violet 18%", note: "badge & nav fills" },
];

const SIGNAL = [
  { name: "success", value: "#34D399", note: "done · low priority" },
  { name: "warning", value: "#FBBF24", note: "review · medium priority" },
  { name: "danger", value: "#FB7185", note: "blocked · high priority" },
  { name: "info", value: "#60A5FA", note: "informational only" },
];

/* ------------------------------------------------------------------ */
/* Canon                                                                */
/* ------------------------------------------------------------------ */

export function Canon() {
  const [progress, setProgress] = useState(63);

  return (
    <div className="mx-auto max-w-[1180px] px-5 py-8 md:px-8 md:py-10">
      {/* Page header */}
      <header className="mb-10">
        <p className="text-overline uppercase text-primary">Design canon</p>
        <h1 className="mt-2 text-h1 text-text-primary">
          The Tyriaq <span className="tq-gradient-text">visual language</span>
        </h1>
        <p className="mt-3 max-w-2xl text-body-lg text-text-secondary">
          Every token, primitive and rule the product is built from. This page renders inside the real
          application shell — if something reads wrong here, it reads wrong everywhere.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {["Dark-first", "Violet accent", "Edge-lit depth", "Glow is a state"].map((t) => (
            <Badge key={t} variant="outline">
              {t}
            </Badge>
          ))}
        </div>
      </header>

      <div className="flex flex-col gap-14">
        {/* ---------------------------------------------------------- */}
        <Section
          id="foundations"
          title="The four moves"
          rule="These are what separate Tyriaq from a generic dark SaaS theme. Everything below is downstream of them."
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                t: "Aurora bleed",
                d: "One violet wash across the whole canvas, applied once at the shell root. Never per-card — two auroras and the depth cue inverts.",
              },
              {
                t: "Rationed cosmic",
                d: "The nebula surface is the most distinctive asset and the biggest trap. At most one visible per viewport.",
              },
              {
                t: "Edge-lit depth",
                d: "A 1px inset highlight on the top edge, plus ambient occlusion. Surfaces stay dark; only their rim catches light.",
              },
              {
                t: "Glow is a state",
                d: "Primary action, active nav, focus, drag target. Nothing at rest glows, and nothing ever pulses.",
              },
            ].map((m) => (
              <Card key={m.t} className="p-4">
                <p className="text-h4 text-text-primary">{m.t}</p>
                <p className="mt-1.5 text-body-sm leading-[19px] text-text-secondary">{m.d}</p>
              </Card>
            ))}
          </div>
        </Section>

        {/* ---------------------------------------------------------- */}
        <Section
          id="color"
          title="Colour"
          rule="Five surface steps, one accent, four signal hues. The accent is safe as text on dark but not as a fill behind white — that is why buttons use the gradient, which lands dark enough to clear 4.5:1."
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-5">
              <p className="mb-4 text-h4 text-text-primary">Surfaces</p>
              <div className="grid gap-4 sm:grid-cols-2">
                {SURFACES.map((s) => (
                  <Swatch key={s.name} {...s} />
                ))}
              </div>
            </Card>
            <Card className="p-5">
              <p className="mb-4 text-h4 text-text-primary">Brand</p>
              <div className="grid gap-4 sm:grid-cols-2">
                {BRAND.map((s) => (
                  <Swatch key={s.name} {...s} />
                ))}
              </div>
            </Card>
            <Card className="p-5">
              <p className="mb-1 text-h4 text-text-primary">Signal</p>
              <p className="mb-4 text-body-sm text-text-secondary">
                Status, priority and analytics only. The only non-violet hues allowed in product chrome.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {SIGNAL.map((s) => (
                  <Swatch key={s.name} {...s} />
                ))}
              </div>
            </Card>
            <Card className="p-5">
              <p className="mb-1 text-h4 text-text-primary">Gradients</p>
              <p className="mb-4 text-body-sm text-text-secondary">
                Two, product-wide. Anything else gets a flat surface.
              </p>
              <div className="flex flex-col gap-3">
                <div className="h-14 rounded-md bg-brand shadow-glow-sm" aria-hidden="true" />
                <p className="text-caption text-text-muted">brand · buttons, avatars, progress fills</p>
                <div
                  className="h-14 rounded-md border border-border-brand bg-aurora"
                  aria-hidden="true"
                />
                <p className="text-caption text-text-muted">aurora · the canvas, once</p>
              </div>
            </Card>
          </div>
        </Section>

        {/* ---------------------------------------------------------- */}
        <Section
          id="typography"
          title="Typography"
          rule="One family — Inter — carrying both roles. Display sizes are separated from body by weight and negative tracking, not by a second typeface. Numerals are tabular wherever a value can change."
        >
          <Card className="divide-y divide-border">
            {[
              { cls: "text-display", name: "display · 44/50 · -0.03em", sample: "Productivity without limits" },
              { cls: "text-h1", name: "h1 · 32/40 · -0.025em", sample: "Campaign Briyan" },
              { cls: "text-h2", name: "h2 · 24/32 · -0.02em", sample: "Progress on goals" },
              { cls: "text-h3", name: "h3 · 19/26 · -0.015em", sample: "Social media visuals" },
              { cls: "text-h4", name: "h4 · 16/24", sample: "Recent activity" },
              { cls: "text-body-lg", name: "body-lg · 16/26", sample: "Organise your tasks and track every project." },
              { cls: "text-body", name: "body · 14/21", sample: "Create a coherent set of visuals for the campaign." },
              { cls: "text-body-sm", name: "body-sm · 13/19", sample: "Design a moodboard and pick the type scale." },
              { cls: "text-caption", name: "caption · 12/16", sample: "Updated 2 hours ago" },
              { cls: "text-overline uppercase text-text-muted", name: "overline · 11 · 0.09em", sample: "Spaces" },
            ].map((t) => (
              <div key={t.name} className="flex flex-col gap-1 px-5 py-3.5 sm:flex-row sm:items-baseline sm:gap-6">
                <p className="w-56 shrink-0 font-mono text-caption text-text-muted">{t.name}</p>
                <p className={`min-w-0 truncate text-text-primary ${t.cls}`}>{t.sample}</p>
              </div>
            ))}
            <div className="flex flex-col gap-1 px-5 py-3.5 sm:flex-row sm:items-baseline sm:gap-6">
              <p className="w-56 shrink-0 font-mono text-caption text-text-muted">metric · 30/36 · tabular</p>
              <p className="text-metric tabular text-text-primary">1,284</p>
            </div>
          </Card>
        </Section>

        {/* ---------------------------------------------------------- */}
        <Section
          id="geometry"
          title="Spacing, radius & depth"
          rule="A 4px base with an 8px rhythm. Five radius steps — chips rounder than cards, cards rounder than inputs, nothing square. Depth is rim plus occlusion, because a drop shadow is invisible on near-black."
        >
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="p-5">
              <p className="mb-4 text-h4 text-text-primary">Spacing</p>
              <div className="flex flex-col gap-2.5">
                {[
                  ["1", 4],
                  ["2", 8],
                  ["3", 12],
                  ["4", 16],
                  ["6", 24],
                  ["8", 32],
                  ["12", 48],
                ].map(([name, px]) => (
                  <div key={name} className="flex items-center gap-3">
                    <span className="w-6 font-mono text-caption tabular text-text-muted">{name}</span>
                    <span className="h-2.5 rounded-sm bg-brand" style={{ width: px as number }} aria-hidden="true" />
                    <span className="font-mono text-caption tabular text-text-muted">{px}px</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <p className="mb-4 text-h4 text-text-primary">Radius</p>
              <div className="flex flex-wrap gap-3">
                {[
                  ["sm", "rounded-sm", "8 · chips"],
                  ["md", "rounded-md", "10 · buttons"],
                  ["lg", "rounded-lg", "14 · cards"],
                  ["xl", "rounded-xl", "18 · panels"],
                  ["2xl", "rounded-2xl", "24 · hero"],
                ].map(([name, cls, note]) => (
                  <div key={name} className="flex flex-col items-center gap-1.5">
                    <span
                      className={`size-14 border border-border-brand bg-primary-subtle ${cls}`}
                      aria-hidden="true"
                    />
                    <span className="font-mono text-caption text-text-muted">{note}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <p className="mb-4 text-h4 text-text-primary">Depth &amp; glow</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["rim", "shadow-rim"],
                  ["card", "shadow-card"],
                  ["lg", "shadow-lg"],
                  ["glow-md", "shadow-glow-md"],
                ].map(([name, cls]) => (
                  <div key={name} className="flex flex-col items-center gap-2">
                    <span className={`h-14 w-full rounded-lg bg-surface-elevated ${cls}`} aria-hidden="true" />
                    <span className="font-mono text-caption text-text-muted">{name}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </Section>

        {/* ---------------------------------------------------------- */}
        <Section
          id="buttons"
          title="Buttons"
          rule="Primary carries the gradient and a resting glow — it is the one control per screen that earns it. Everything else stays flat until focused."
        >
          <Card className="flex flex-col gap-6 p-5">
            <Specimen label="Variants">
              <Button variant="primary">
                <Plus className="size-4" />
                Create task
              </Button>
              <Button variant="secondary">Share</Button>
              <Button variant="subtle">
                <Sparkles className="size-4" />
                Ask Tyriaq
              </Button>
              <Button variant="ghost">Filter</Button>
              <Button variant="destructive">Delete</Button>
              <Button variant="link">View report</Button>
            </Specimen>
            <Specimen label="Sizes">
              <Button size="xs">Extra small</Button>
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
              <IconButton label="More options" variant="secondary">
                <MoreHorizontal className="size-4" />
              </IconButton>
            </Specimen>
            <Specimen label="States">
              <Button loading>Saving</Button>
              <Button disabled>Disabled</Button>
              <Button variant="secondary" disabled>
                Disabled
              </Button>
            </Specimen>
          </Card>
        </Section>

        {/* ---------------------------------------------------------- */}
        <Section
          id="inputs"
          title="Inputs"
          rule="Fields are recessed, not raised — on a dark canvas an input that sits proud of its surface reads as a button. The violet ring on focus is the only moment it gains elevation."
        >
          <Card className="grid gap-5 p-5 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ds-name" className="text-label text-text-secondary">
                Task name
              </label>
              <Input id="ds-name" placeholder="What needs doing?" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ds-search" className="text-label text-text-secondary">
                With adornments
              </label>
              <Input
                id="ds-search"
                placeholder="Search tasks…"
                icon={<Search className="size-4" />}
                trailing={<Kbd>⌘K</Kbd>}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ds-err" className="text-label text-text-secondary">
                Error
              </label>
              <Input id="ds-err" defaultValue="not-an-email" error aria-describedby="ds-err-msg" />
              <p id="ds-err-msg" className="text-caption text-danger">
                Enter a valid email address.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ds-dis" className="text-label text-text-secondary">
                Disabled
              </label>
              <Input id="ds-dis" defaultValue="Locked by workspace policy" disabled />
            </div>
          </Card>
        </Section>

        {/* ---------------------------------------------------------- */}
        <Section
          id="surfaces"
          title="Cards"
          rule="Four variants. Default is the workhorse; cosmic is capped at one per viewport, and this section is spending that budget."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="p-4">
              <p className="text-h4 text-text-primary">Default</p>
              <p className="mt-1.5 text-body-sm text-text-secondary">
                Rim plus ambient occlusion. Use this unless there is a reason not to.
              </p>
            </Card>
            <Card variant="glass" className="p-4">
              <p className="text-h4 text-text-primary">Glass</p>
              <p className="mt-1.5 text-body-sm text-text-secondary">
                Translucent, lets the aurora through. Needs a backdrop to read.
              </p>
            </Card>
            <Card variant="cosmic" className="p-4">
              <p className="text-h4 text-text-primary">Cosmic</p>
              <p className="mt-1.5 text-body-sm text-text-secondary">
                Goal progress, panel headers, empty states. One per viewport.
              </p>
            </Card>
            <Card variant="flat" className="p-4">
              <p className="text-h4 text-text-primary">Flat</p>
              <p className="mt-1.5 text-body-sm text-text-secondary">
                For cards nested inside a surface, where a second rim would double the border.
              </p>
            </Card>
          </div>
        </Section>

        {/* ---------------------------------------------------------- */}
        <Section
          id="indicators"
          title="Badges, status & progress"
          rule="Colour is never the only carrier — every status ships a label or an accessible name, so it survives a colour-vision deficiency."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="flex flex-col gap-6 p-5">
              <Specimen label="Badges">
                <Badge variant="primary">Marketing</Badge>
                <Badge variant="success">Done</Badge>
                <Badge variant="warning">In review</Badge>
                <Badge variant="danger">Overdue</Badge>
                <Badge variant="info">Automated</Badge>
                <Badge variant="neutral">Draft</Badge>
                <Badge variant="outline">v2</Badge>
                <Badge variant="chrome" size="sm">
                  23
                </Badge>
              </Specimen>
              <Specimen label="Status">
                <StatusDot tone="todo" showLabel />
                <StatusDot tone="in_progress" showLabel emphasis />
                <StatusDot tone="review" showLabel />
                <StatusDot tone="done" showLabel />
                <StatusDot tone="blocked" showLabel />
              </Specimen>
              <Specimen label="Avatars">
                <Avatar name="Hakim Aissa" size="xs" />
                <Avatar name="Amina Belkacem" size="sm" />
                <Avatar name="Yacine Meddour" size="md" presence="online" />
                <Avatar name="Meriem Khelifi" size="lg" presence="away" />
                <AvatarGroup
                  people={[
                    { id: "1", name: "Hakim Aissa" },
                    { id: "2", name: "Amina Belkacem" },
                    { id: "3", name: "Yacine Meddour" },
                    { id: "4", name: "Meriem Khelifi" },
                    { id: "5", name: "Oussama Larbi" },
                  ]}
                  max={3}
                />
              </Specimen>
            </Card>

            <Card className="flex flex-col gap-6 p-5">
              <div className="flex flex-col gap-3">
                <p className="text-overline uppercase text-text-muted">Progress</p>
                <Progress value={progress} label="Campaign completion" showValue />
                <Progress value={40} tone="warning" label="At risk" showValue />
                <Progress value={88} tone="success" label="Ahead of plan" showValue />
                <div className="flex items-center gap-4 pt-1">
                  <ProgressRing value={progress} label="Campaign completion" />
                  <ProgressRing value={40} tone="warning" size={48} label="At risk" />
                  <ProgressRing value={88} tone="success" size={56} strokeWidth={4} label="Ahead" />
                  <Button size="sm" variant="secondary" onClick={() => setProgress((p) => (p + 17) % 101)}>
                    Advance
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </Section>

        {/* ---------------------------------------------------------- */}
        <Section
          id="overlays"
          title="Tabs, dropdowns & modals"
          rule="Two tab treatments: underline for navigating an object, pill for switching a view's mode. Overlays sit on the elevated surface with a strong rim, over a deep scrim."
        >
          <Card className="flex flex-col gap-6 p-5">
            <div>
              <p className="mb-3 text-overline uppercase text-text-muted">Tabs · underline</p>
              <Tabs defaultValue="list">
                <TabsList>
                  <TabsTrigger value="list">List</TabsTrigger>
                  <TabsTrigger value="board">Board</TabsTrigger>
                  <TabsTrigger value="gantt">Gantt</TabsTrigger>
                  <TabsTrigger value="calendar">Calendar</TabsTrigger>
                  <TabsTrigger value="files" disabled>
                    Files
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="list">
                  <p className="text-body-sm text-text-secondary">
                    Underline tabs navigate an object — a project, a profile, a report.
                  </p>
                </TabsContent>
                <TabsContent value="board">
                  <p className="text-body-sm text-text-secondary">Board view.</p>
                </TabsContent>
                <TabsContent value="gantt">
                  <p className="text-body-sm text-text-secondary">Gantt view.</p>
                </TabsContent>
                <TabsContent value="calendar">
                  <p className="text-body-sm text-text-secondary">Calendar view.</p>
                </TabsContent>
              </Tabs>
            </div>

            <div>
              <p className="mb-3 text-overline uppercase text-text-muted">Tabs · pill</p>
              <Tabs defaultValue="all">
                <TabsList variant="pill">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="mine">Assigned to me</TabsTrigger>
                  <TabsTrigger value="due">Due soon</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <Specimen label="Overlays">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary">
                    Open menu
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuItem>
                    <CheckSquare className="size-4" />
                    Mark complete
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Calendar className="size-4" />
                    Set due date
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Paperclip className="size-4" />
                    Attach file
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem destructive>Delete task</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="secondary">Open modal</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create a space</DialogTitle>
                    <DialogDescription>
                      Spaces group related projects, documents and goals for a team.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="ds-space" className="text-label text-text-secondary">
                      Name
                    </label>
                    <Input id="ds-space" placeholder="e.g. Engineering" autoFocus />
                  </div>
                  <DialogFooter>
                    <Button variant="ghost">Cancel</Button>
                    <Button>Create space</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </Specimen>
          </Card>
        </Section>

        {/* ---------------------------------------------------------- */}
        <Section
          id="composition"
          title="In composition"
          rule="The real test: high information density that still breathes. Every element below is a primitive from this page — nothing bespoke."
        >
          <div className="grid gap-4 xl:grid-cols-3">
            <div className="flex flex-col gap-4 xl:col-span-2">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="To do" value="23" delta={{ value: "+12% from yesterday", direction: "up" }} icon={<CheckSquare className="size-4" />} />
                <StatCard label="In progress" value="8" delta={{ value: "+5% from yesterday", direction: "up" }} icon={<TrendingUp className="size-4" />} tone="info" />
                <StatCard label="Completed" value="45" delta={{ value: "+20% from yesterday", direction: "up" }} icon={<Target className="size-4" />} tone="success" />
                <StatCard label="Overdue" value="3" delta={{ value: "-2% from yesterday", direction: "down" }} icon={<Flag className="size-4" />} tone="danger" />
              </div>

              <Card>
                <CardHeader className="flex-row items-center justify-between gap-3 pb-3">
                  <CardTitle>My tasks</CardTitle>
                  <Button variant="ghost" size="sm">
                    View all
                    <ArrowUpRight className="size-3.5" />
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <ul className="divide-y divide-border">
                    {[
                      { n: "Finalise the Briyan campaign", s: "Marketing", d: "25 Aug", p: "High", tone: "danger", st: "in_progress" },
                      { n: "Design the poster set", s: "Design", d: "20 Aug", p: "Medium", tone: "warning", st: "review" },
                      { n: "Partner sync meeting", s: "Operations", d: "22 Aug", p: "High", tone: "danger", st: "todo" },
                      { n: "Prepare social content", s: "Marketing", d: "21 Aug", p: "Medium", tone: "warning", st: "in_progress" },
                      { n: "Transport logistics", s: "Operations", d: "23 Aug", p: "Low", tone: "success", st: "done" },
                    ].map((t) => (
                      <li
                        key={t.n}
                        className="flex items-center gap-3 px-5 py-2.5 transition-colors duration-fast hover:bg-white/[0.02]"
                      >
                        <StatusDot tone={t.st as "todo"} />
                        <span className="min-w-0 flex-1 truncate text-body-sm text-text-primary">{t.n}</span>
                        <Badge variant="primary" size="sm" className="hidden sm:inline-flex">
                          {t.s}
                        </Badge>
                        <AvatarGroup
                          people={[
                            { id: "a", name: "Amina Belkacem" },
                            { id: "b", name: "Yacine Meddour" },
                          ]}
                          max={2}
                          size="xs"
                        />
                        <span className="hidden w-16 shrink-0 text-caption tabular text-text-muted sm:block">
                          {t.d}
                        </span>
                        <span
                          className={`hidden w-16 shrink-0 text-caption font-medium sm:block ${
                            t.tone === "danger" ? "text-danger" : t.tone === "warning" ? "text-warning" : "text-success"
                          }`}
                        >
                          {t.p}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-5 py-3 text-body-sm text-text-muted transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:shadow-focus"
                  >
                    <Plus className="size-4" />
                    Add task
                  </button>
                </CardContent>
              </Card>
            </div>

            <Card className="flex flex-col gap-4 p-5">
              <div className="flex items-center justify-between">
                <p className="text-h4 text-text-primary">Goal progress</p>
                <Button variant="ghost" size="xs">
                  View all
                </Button>
              </div>
              {[
                { n: "Launch the Briyan campaign", v: 75 },
                { n: "Ship Tyriaq 1.0", v: 60 },
                { n: "Reach 1,000 subscribers", v: 45 },
              ].map((g) => (
                <div key={g.n} className="flex flex-col gap-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="min-w-0 truncate text-body-sm text-text-primary">{g.n}</p>
                    <p className="shrink-0 text-caption tabular text-text-secondary">{g.v}%</p>
                  </div>
                  <Progress value={g.v} label={g.n} />
                </div>
              ))}
              <div className="tq-rule my-1" aria-hidden="true" />
              <p className="text-overline uppercase text-text-muted">Recent activity</p>
              {[
                { w: "Amina", a: "commented on", o: "Poster design", t: "2h ago" },
                { w: "Yacine", a: "completed", o: "Budget forecast", t: "3h ago" },
                { w: "Meriem", a: "joined", o: "Design space", t: "5h ago" },
              ].map((a) => (
                <div key={a.o} className="flex items-start gap-2.5">
                  <Avatar name={a.w} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-sm text-text-secondary">
                      <span className="font-medium text-text-primary">{a.w}</span> {a.a}{" "}
                      <span className="text-text-primary">{a.o}</span>
                    </p>
                    <p className="text-caption text-text-muted">{a.t}</p>
                  </div>
                </div>
              ))}
            </Card>
          </div>
        </Section>
      </div>
    </div>
  );
}
