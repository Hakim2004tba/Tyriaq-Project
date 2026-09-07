import type { JSX } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  FolderKanban,
  Layers,
  Plus,
} from "lucide-react";
import { AvatarGroup, Badge, Button, EmptyState, Progress, SectionCard, StatCard } from "@flow/ui";
import { cn } from "@flow/utils";
import { SpaceBadge } from "@/components/spaces/space-badge";
import { getProfile } from "@/lib/auth/session";
import { getCurrentWorkspace, getProjects, getSpaces } from "@/lib/data/queries";
import { PROJECT_STATUS_META, formatDate, isOverdue, progressOf } from "@/lib/data/types";

export const metadata: Metadata = {
  title: "Home",
  description: "Your workspace at a glance.",
};

/**
 * The workspace overview.
 *
 * Built entirely from spaces and projects — the only things that exist in
 * the database so far. Task counts, goals and activity feeds return when
 * those tables do; inventing them here would make a real dashboard lie.
 */
export default async function DashboardPage(): Promise<JSX.Element> {
  const [profile, workspace, spaces, projects] = await Promise.all([
    getProfile(),
    getCurrentWorkspace(),
    getSpaces(),
    getProjects(),
  ]);

  const activeSpaces = spaces.filter((s) => !s.archived);
  const activeProjects = projects.filter((p) => !p.archived);
  const completed = activeProjects.filter((p) => p.status === "completed").length;
  const atRisk = activeProjects.filter((p) => p.status === "at_risk" || p.status === "off_track").length;
  const late = activeProjects.filter(isOverdue).length;
  const firstName = (profile?.fullName || profile?.email || "there").split(" ")[0];

  const recent = activeProjects.slice(0, 6);

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-caption text-text-muted">{workspace?.name ?? "Your workspace"}</p>
          <h1 className="mt-1 text-h1 text-text-primary">
            Welcome back, <span className="tq-gradient-text">{firstName}</span>
          </h1>
          <p className="mt-2 max-w-xl text-body text-text-secondary">
            {activeProjects.length === 0
              ? "Nothing here yet — create a space, then add your first project."
              : `${activeProjects.length} active ${activeProjects.length === 1 ? "project" : "projects"} across ${activeSpaces.length} ${activeSpaces.length === 1 ? "space" : "spaces"}.`}
          </p>
        </div>
        <Button asChild variant="primary" size="md" className="shrink-0">
          <Link href="/projects">
            <Plus className="size-4" />
            New project
          </Link>
        </Button>
      </header>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Spaces" value={activeSpaces.length} icon={<Layers className="size-4" />} tone="primary" />
        <StatCard label="Projects" value={activeProjects.length} icon={<FolderKanban className="size-4" />} tone="info" />
        <StatCard label="Completed" value={completed} icon={<CheckCircle2 className="size-4" />} tone="success" />
        <StatCard
          label="Needs attention"
          value={atRisk + late}
          delta={late > 0 ? { value: `${late} past due`, direction: "down" } : undefined}
          icon={<AlertTriangle className="size-4" />}
          tone="danger"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <SectionCard
            title="Recent projects"
            subtitle="Ordered by last activity"
            flush
            action={
              <Button variant="ghost" size="sm" asChild>
                <Link href="/projects">
                  View all
                  <ArrowUpRight className="size-3.5" />
                </Link>
              </Button>
            }
          >
            {recent.length === 0 ? (
              <div className="px-5 pb-6">
                <EmptyState
                  icon={<FolderKanban className="size-5" />}
                  title="No projects yet"
                  description="Projects live inside spaces. Create a space first, then add a project to it."
                  action={
                    <Button variant="secondary" size="sm" asChild>
                      <Link href="/spaces?new=1">Create a space</Link>
                    </Button>
                  }
                />
              </div>
            ) : (
              <ul className="divide-y divide-border border-t border-border">
                {recent.map((p) => {
                  const status = PROJECT_STATUS_META[p.status];
                  return (
                    <li key={p.id}>
                      <Link
                        href={`/projects/${p.slug}`}
                        className="flex items-center gap-3 px-5 py-2.5 transition-colors duration-fast
                                   hover:bg-white/[0.025] focus-visible:outline-none focus-visible:bg-white/[0.04]"
                      >
                        <span className={cn("size-2 shrink-0 rounded-full", status.dot)} aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate text-body-sm text-text-primary">{p.name}</span>
                        <Badge variant="primary" size="sm" className="hidden shrink-0 sm:inline-flex">
                          {p.spaceName}
                        </Badge>
                        <span className="hidden w-24 shrink-0 items-center gap-2 md:flex">
                          <Progress value={progressOf(p)} label={`${p.name} progress`} className="flex-1" />
                        </span>
                        <span
                          className={cn(
                            "hidden w-24 shrink-0 text-right text-caption tabular sm:block",
                            isOverdue(p) ? "text-danger" : "text-text-muted"
                          )}
                        >
                          {formatDate(p.dueDate)}
                        </span>
                        <AvatarGroup
                          people={p.members.map((m) => ({ id: m.id, name: m.name, avatarUrl: m.avatarUrl }))}
                          max={2}
                          size="xs"
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>
        </div>

        <SectionCard
          title="Spaces"
          subtitle={`${activeSpaces.length} active`}
          action={
            <Button variant="ghost" size="sm" asChild>
              <Link href="/spaces">
                Manage
                <ArrowUpRight className="size-3.5" />
              </Link>
            </Button>
          }
        >
          {activeSpaces.length === 0 ? (
            <p className="text-body-sm text-text-muted">No spaces yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {activeSpaces.map((s) => {
                const count = activeProjects.filter((p) => p.spaceId === s.id).length;
                return (
                  <li key={s.id}>
                    <Link
                      href={`/spaces/${s.slug}`}
                      className="flex items-center gap-2.5 rounded-md py-1 transition-colors
                                 hover:text-text-primary focus-visible:outline-none focus-visible:shadow-focus"
                    >
                      <SpaceBadge icon={s.icon} color={s.color} size="xs" />
                      <span className="min-w-0 flex-1 truncate text-body-sm text-text-primary">{s.name}</span>
                      <span className="shrink-0 text-caption tabular text-text-muted">{count}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
