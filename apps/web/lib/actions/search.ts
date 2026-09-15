"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getCurrentWorkspace } from "@/lib/data/queries";

/**
 * One search across everything the caller can reach.
 *
 * The top bar has advertised this since the shell was built and opened
 * nothing — a button promising ⌘K with no results behind it, which is
 * the first thing anybody tries.
 *
 * Five small queries rather than one clever one. Postgres could union
 * them with a materialised search table, and at a million rows it would
 * have to; at the size a workspace actually reaches, five indexed
 * `ilike` scans in parallel are faster to run and far easier to keep
 * honest — every one of them goes through the same policies as the page
 * it links to, so search can never show somebody a title they are not
 * allowed to open.
 */

export type SearchKind = "task" | "project" | "document" | "person" | "space";

export interface SearchHit {
  id: string;
  kind: SearchKind;
  title: string;
  /** The line under the title — a project name, a space, a role. */
  context: string | null;
  href: string;
}

const LIMIT = 6;

/** Escapes what `ilike` treats as wildcards, so a literal % finds a %. */
function pattern(term: string): string {
  return `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

export async function search(term: string): Promise<SearchHit[]> {
  const q = term.trim();
  // One letter matches most of a workspace; the result is noise that
  // arrives while somebody is still typing the second letter.
  if (q.length < 2) return [];

  const user = await getCurrentUser();
  if (!user) return [];
  const ws = await getCurrentWorkspace();
  if (!ws) return [];

  const supabase = await createClient();
  const like = pattern(q);

  const [tasks, projects, documents, spaces, people] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, project_id, status, projects(name, slug)")
      .ilike("title", like)
      .limit(LIMIT),
    supabase
      .from("projects")
      .select("id, name, slug, spaces(name)")
      .ilike("name", like)
      .limit(LIMIT),
    supabase
      .from("documents")
      .select("id, title, projects(name)")
      .ilike("title", like)
      .is("archived_at", null)
      .limit(LIMIT),
    supabase
      .from("spaces")
      .select("id, name, slug")
      .ilike("name", like)
      .is("archived_at", null)
      .limit(LIMIT),
    /*
      People are searched through `workspace_members` rather than
      `profiles` directly: profiles are readable by any signed-in user,
      so searching them would let somebody enumerate every account on the
      server by typing letters.
    */
    supabase
      .from("workspace_members")
      .select("user_id, role, profiles!user_id(id, full_name)")
      .eq("workspace_id", ws.id)
      .limit(40),
  ]);

  const hits: SearchHit[] = [];

  for (const row of (tasks.data ?? []) as unknown as {
    id: string; title: string; status: string; projects: { name: string; slug: string } | null;
  }[]) {
    hits.push({
      id: row.id,
      kind: "task",
      title: row.title,
      context: row.projects?.name ?? null,
      // Straight to the task, open — not to the board it sits on.
      href: row.projects?.slug ? `/projects/${row.projects.slug}?task=${row.id}` : "/my-tasks",
    });
  }

  for (const row of (projects.data ?? []) as unknown as {
    id: string; name: string; slug: string; spaces: { name: string } | null;
  }[]) {
    hits.push({
      id: row.id,
      kind: "project",
      title: row.name,
      context: row.spaces?.name ?? null,
      href: `/projects/${row.slug}`,
    });
  }

  for (const row of (documents.data ?? []) as unknown as {
    id: string; title: string; projects: { name: string } | null;
  }[]) {
    hits.push({
      id: row.id,
      kind: "document",
      title: row.title,
      context: row.projects?.name ?? "Workspace",
      href: `/documents/${row.id}`,
    });
  }

  for (const row of (spaces.data ?? []) as unknown as {
    id: string; name: string; slug: string;
  }[]) {
    hits.push({
      id: row.id,
      kind: "space",
      title: row.name,
      context: "Space",
      href: `/spaces/${row.slug}`,
    });
  }

  const needle = q.toLowerCase();
  for (const row of (people.data ?? []) as unknown as {
    user_id: string; role: string; profiles: { id: string; full_name: string } | null;
  }[]) {
    const name = row.profiles?.full_name ?? "";
    if (!name.toLowerCase().includes(needle)) continue;
    hits.push({
      id: row.user_id,
      kind: "person",
      title: name,
      context: row.role === "member" ? "Member" : `Workspace ${row.role}`,
      href: "/settings/people",
    });
    if (hits.filter((hit) => hit.kind === "person").length >= LIMIT) break;
  }

  /*
    Exact prefixes first.

    Someone typing "des" wants "Design the hero" before "Fix the
    description", and the database's own ordering has no idea which is
    which — it only knows both matched.
  */
  return hits.sort((a, b) => {
    const aStarts = a.title.toLowerCase().startsWith(needle) ? 0 : 1;
    const bStarts = b.title.toLowerCase().startsWith(needle) ? 0 : 1;
    if (aStarts !== bStarts) return aStarts - bStarts;
    return a.title.length - b.title.length;
  });
}
