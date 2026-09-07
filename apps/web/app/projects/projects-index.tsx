"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowDownUp,
  Check,
  ChevronDown,
  FolderKanban,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  Input,
  Tabs,
  TabsList,
  TabsTrigger,
  toast,
} from "@flow/ui";
import { ProjectEditor } from "@/components/projects/project-editor";
import { setProjectArchived } from "@/lib/actions/project";
import {
  progressOf,
  type Project,
  type ProjectStatus,
  type Space,
} from "@/lib/data/types";
import { ProjectCard } from "./project-card";

type StatusFilter = "all" | "active" | ProjectStatus;
type SortKey = "recent" | "name" | "progress" | "due";

const STATUS_TABS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "at_risk", label: "At risk" },
  { id: "on_hold", label: "On hold" },
  { id: "completed", label: "Completed" },
];

const SORTS: { id: SortKey; label: string; compare: (a: Project, b: Project) => number }[] = [
  // The query already returns most-recently-updated first, so "recent" is
  // the identity sort rather than a comparison on a formatted string.
  { id: "recent", label: "Recently active", compare: () => 0 },
  { id: "name", label: "Name", compare: (a, b) => a.name.localeCompare(b.name) },
  { id: "progress", label: "Progress", compare: (a, b) => progressOf(b) - progressOf(a) },
  {
    id: "due",
    label: "Due date",
    // Undated projects sort last rather than first — a missing date is not
    // an urgent one.
    compare: (a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"),
  },
];

export function ProjectsIndex({
  projects,
  spaces,
  workspaceName,
}: {
  projects: Project[];
  spaces: Space[];
  workspaceName: string;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [spaceId, setSpaceId] = useState("all");
  const [sort, setSort] = useState<SortKey>("recent");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Project | undefined>(undefined);
  const [, startTransition] = useTransition();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = projects.filter((p) => {
      if (q && !`${p.name} ${p.spaceName} ${p.description}`.toLowerCase().includes(q)) return false;
      if (spaceId !== "all" && p.spaceId !== spaceId) return false;
      if (status === "all") return true;
      if (status === "active") return !p.archived && p.status !== "completed" && p.status !== "on_hold";
      return p.status === status;
    });
    return [...rows].sort(SORTS.find((s) => s.id === sort)!.compare);
  }, [projects, query, status, spaceId, sort]);

  const activeSort = SORTS.find((s) => s.id === sort)!;
  const lateCount = projects.filter(
    (p) => !p.archived && p.dueDate && p.status !== "completed" && p.dueDate < new Date().toISOString().slice(0, 10)
  ).length;

  function archive(project: Project) {
    startTransition(async () => {
      const r = await setProjectArchived(project.id, !project.archived);
      if (r.error) toast.error(r.error);
      else if (r.message) toast.success(r.message);
    });
  }

  const openCreate = () => {
    setEditing(undefined);
    setEditorOpen(true);
  };

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-h1 text-text-primary">Projects</h1>
          <p className="mt-1.5 text-body text-text-secondary">
            {projects.length} {projects.length === 1 ? "project" : "projects"} across {spaces.length}{" "}
            {spaces.length === 1 ? "space" : "spaces"} in {workspaceName}
            {lateCount > 0 && <span className="text-danger"> · {lateCount} past due</span>}
          </p>
        </div>
        <Button variant="primary" size="md" className="shrink-0" onClick={openCreate} disabled={spaces.length === 0}>
          <Plus className="size-4" />
          New project
        </Button>
      </header>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
          <TabsList variant="pill" className="w-full overflow-x-auto tq-scroll-none lg:w-auto">
            {STATUS_TABS.map((t) => (
              <TabsTrigger key={t.id} value={t.id}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects…"
            aria-label="Search projects"
            icon={<Search className="size-4" />}
            trailing={
              query ? (
                <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="rounded transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:shadow-focus">
                  <X className="size-4" />
                </button>
              ) : undefined
            }
            className="lg:w-64"
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="md" className="shrink-0">
                <SlidersHorizontal className="size-4" />
                <span className="hidden sm:inline">Space</span>
                {spaceId !== "all" && <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onSelect={() => setSpaceId("all")}>
                <span className="flex size-4 items-center justify-center">{spaceId === "all" && <Check className="size-4" />}</span>
                All spaces
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {spaces.map((s) => (
                <DropdownMenuItem key={s.id} onSelect={() => setSpaceId(s.id)}>
                  <span className="flex size-4 items-center justify-center">{spaceId === s.id && <Check className="size-4" />}</span>
                  {s.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="md" className="shrink-0">
                <ArrowDownUp className="size-4" />
                <span className="hidden truncate sm:inline">{activeSort.label}</span>
                <ChevronDown className="size-3.5 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {SORTS.map((s) => (
                <DropdownMenuItem key={s.id} onSelect={() => setSort(s.id)}>
                  <span className="flex size-4 items-center justify-center">{sort === s.id && <Check className="size-4" />}</span>
                  {s.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {spaces.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="size-5" />}
          title="Create a space first"
          description="Projects live inside spaces, so you need one before you can add a project."
          action={
            <Button variant="secondary" size="sm" asChild>
              <Link href="/spaces?new=1">Create a space</Link>
            </Button>
          }
        />
      ) : results.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="size-5" />}
          title={projects.length === 0 ? "No projects yet" : "No projects match"}
          description={
            projects.length === 0
              ? "Create your first project to start organising work."
              : "Try a different search term, or clear the filters."
          }
          action={
            projects.length === 0 ? (
              <Button variant="secondary" size="sm" onClick={openCreate}>
                Create a project
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setQuery("");
                  setStatus("all");
                  setSpaceId("all");
                }}
              >
                Clear filters
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {results.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              onEdit={() => {
                setEditing(p);
                setEditorOpen(true);
              }}
              onArchive={() => archive(p)}
            />
          ))}
        </div>
      )}

      <ProjectEditor open={editorOpen} onOpenChange={setEditorOpen} spaces={spaces} project={editing} />
    </div>
  );
}
