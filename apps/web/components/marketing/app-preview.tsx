import {
  Bell,
  CalendarDays,
  CheckSquare,
  FolderKanban,
  Home,
  MessagesSquare,
  Search,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@flow/utils";

/**
 * The product, shown rather than described.
 *
 * Built out of the same tokens as the real interface rather than pasted
 * in as a screenshot: it stays sharp at any density, it cannot go stale
 * the next time the shell changes, and it weighs a few kilobytes instead
 * of a few hundred.
 */

const NAV = [
  { icon: Home, label: "Home", active: true },
  { icon: CheckSquare, label: "My tasks" },
  { icon: FolderKanban, label: "Projects" },
  { icon: CalendarDays, label: "Calendar" },
  { icon: MessagesSquare, label: "Messages" },
  { icon: Users, label: "Team" },
  { icon: Settings, label: "Settings" },
];

const STATS = [
  { label: "Tasks in progress", value: "12" },
  { label: "Active projects", value: "5" },
  { label: "Team members", value: "8" },
  { label: "Due this week", value: "3" },
];

const PROJECTS = [
  { name: "Academy website", status: "In progress", tone: "text-info", dot: "bg-info", value: 70 },
  { name: "Mobile app", status: "Planned", tone: "text-warning", dot: "bg-warning", value: 20 },
  { name: "Marketing campaign", status: "In progress", tone: "text-info", dot: "bg-warning", value: 45 },
  { name: "Design system", status: "Done", tone: "text-success", dot: "bg-success", value: 100 },
];

const TASKS = [
  { title: "Finish the UI mockup", meta: "Today · Design" },
  { title: "Team stand-up", meta: "Today · 10:00" },
  { title: "API development", meta: "Today · Dev" },
  { title: "Prepare the presentation", meta: "Today · 16:00" },
];

export function AppPreview({ className }: { className?: string }) {
  return (
    <div
      // Decorative: everything inside is repeated in the copy beside it,
      // so a screen reader announcing it twice would be noise.
      aria-hidden="true"
      className={cn(
        "overflow-hidden rounded-xl border border-white/10 bg-background shadow-[0_40px_120px_-30px_rgba(88,28,235,0.55)]",
        className
      )}
    >
      <div className="flex min-h-[380px] text-[10px] leading-tight">
        {/* sidebar */}
        <aside className="hidden w-[132px] shrink-0 flex-col gap-3 border-r border-white/[0.06] bg-surface-muted/80 p-3 sm:flex">
          <div className="flex items-center gap-1.5">
            <span className="flex size-5 items-center justify-center rounded-md bg-brand text-[9px] font-bold text-white">
              T
            </span>
            <span className="text-[11px] font-semibold text-text-primary">tyriaq</span>
          </div>

          <ul className="flex flex-col gap-0.5">
            {NAV.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.label}>
                  <span
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-1.5 py-1.5",
                      item.active ? "bg-primary-muted text-primary" : "text-text-muted"
                    )}
                  >
                    <Icon className="size-3 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* main */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2">
            <span className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md border border-white/[0.06] bg-surface-muted px-2 py-1 text-text-muted">
              <Search className="size-2.5 shrink-0" />
              <span className="truncate">Search…</span>
            </span>
            <Bell className="size-3 shrink-0 text-text-muted" />
            <span className="size-4 shrink-0 rounded-full bg-brand" />
          </header>

          <div className="flex flex-col gap-2.5 p-3">
            <div>
              <p className="text-[13px] font-semibold text-text-primary">Hello, Hakim 👋</p>
              <p className="text-text-muted">Here is where your projects stand today.</p>
            </div>

            <ul className="grid grid-cols-2 gap-1.5 lg:grid-cols-4">
              {STATS.map((stat) => (
                <li
                  key={stat.label}
                  className="rounded-lg border border-white/[0.06] bg-surface px-2 py-1.5"
                >
                  <p className="truncate text-[8px] text-text-muted">{stat.label}</p>
                  <p className="mt-0.5 text-[15px] font-semibold tabular-nums text-text-primary">
                    {stat.value}
                  </p>
                </li>
              ))}
            </ul>

            <div className="grid gap-1.5 lg:grid-cols-[1.35fr_1fr]">
              <section className="rounded-lg border border-white/[0.06] bg-surface p-2">
                <p className="mb-1.5 text-[10px] font-medium text-text-primary">My projects</p>
                <ul className="flex flex-col gap-1.5">
                  {PROJECTS.map((project) => (
                    <li key={project.name} className="flex items-center gap-1.5">
                      <span className={cn("size-1.5 shrink-0 rounded-full", project.dot)} />
                      <span className="min-w-0 flex-1 truncate text-text-secondary">{project.name}</span>
                      <span className={cn("hidden shrink-0 text-[8px] sm:inline", project.tone)}>
                        {project.status}
                      </span>
                      <span className="h-1 w-10 shrink-0 overflow-hidden rounded-full bg-white/[0.07]">
                        <span
                          className={cn(
                            "block h-full rounded-full",
                            project.value === 100 ? "bg-success" : "bg-brand"
                          )}
                          style={{ width: `${project.value}%` }}
                        />
                      </span>
                      <span className="w-6 shrink-0 text-right text-[8px] tabular-nums text-text-muted">
                        {project.value}%
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="rounded-lg border border-white/[0.06] bg-surface p-2">
                <p className="mb-1.5 text-[10px] font-medium text-text-primary">Today&rsquo;s tasks</p>
                <ul className="flex flex-col gap-1.5">
                  {TASKS.map((task) => (
                    <li key={task.title} className="flex items-start gap-1.5">
                      <span className="mt-[3px] size-2 shrink-0 rounded-[3px] border border-white/20" />
                      <span className="min-w-0">
                        <span className="block truncate text-text-secondary">{task.title}</span>
                        <span className="block truncate text-[8px] text-text-muted">{task.meta}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
