-- Tyriaq — saved views
--
-- Filters live in component state and die with the page. "Ahmed's
-- overdue work, grouped by priority" is a question somebody asks every
-- Monday, and today it has to be rebuilt by hand every Monday — so most
-- people stop filtering at all and scroll instead.
--
-- A view is a name and a bag of settings. The settings are jsonb rather
-- than columns because they are UI state — which filters, which sort,
-- which grouping, which layout — and every new control on the toolbar
-- would otherwise be a migration. Nothing in the database reads inside
-- it; only the screen that saved it does.

create table if not exists public.saved_views (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  /** Null means it applies wherever tasks are listed, not one board. */
  project_id uuid references public.projects (id) on delete cascade,
  name text not null,
  /** list | board | calendar | gantt — which screen it opens. */
  layout text not null default 'list',
  config jsonb not null default '{}'::jsonb,

  /*
    A private view is one person's working set; a shared one is how a
    team agrees what "the backlog" means. Both are wanted, and the
    difference is one boolean rather than two features.
  */
  is_shared boolean not null default false,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint saved_views_name_length check (char_length(name) between 1 and 60),
  constraint saved_views_layout_known check (layout in ('list', 'board', 'calendar', 'gantt'))
);

alter table public.saved_views enable row level security;

-- A stable order without asking people to drag them: newest last.
alter table public.saved_views
  add column if not exists position_hint integer not null default 0;

create index if not exists saved_views_project_idx
  on public.saved_views (project_id, position_hint) where project_id is not null;

create index if not exists saved_views_owner_idx on public.saved_views (created_by);

/*
  You see your own views, and the shared views of projects you can
  reach. A shared view names no rows itself — it is a saved question,
  and the answer is still filtered by what the reader may see, so two
  people opening "Everything overdue" correctly see different tasks.
*/
drop policy if exists "people read their own and shared views" on public.saved_views;
/*
  Yours, or the team's — but only while you can still reach what it
  points at.

  The ownership half was unconditional at first, which left somebody
  removed from a space holding a saved view for a board they can no
  longer open. Not a leak: the config is filter settings they chose
  themselves, and following the view shows nothing. But a bookmark to a
  door that no longer exists is a bug report waiting to be written.
*/
create policy "people read their own and shared views"
  on public.saved_views for select
  to authenticated
  using (
    (created_by = (select auth.uid()) or is_shared)
    and case
      when project_id is null then public.is_workspace_member(workspace_id)
      else public.can_see_project(project_id)
    end
  );

drop policy if exists "people save their own views" on public.saved_views;
create policy "people save their own views"
  on public.saved_views for insert
  to authenticated
  with check (
    created_by = (select auth.uid())
    and case
      when project_id is null then public.is_workspace_member(workspace_id)
      else public.can_see_project(project_id)
    end
  );

/*
  Only the author edits or deletes, including for shared views.

  A shared view that anybody can rewrite is a shared view nobody can
  rely on — "the backlog" changing meaning because somebody adjusted a
  filter is worse than having to ask its author.
*/
drop policy if exists "authors change their views" on public.saved_views;
create policy "authors change their views"
  on public.saved_views for update
  to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

drop policy if exists "authors delete their views" on public.saved_views;
create policy "authors delete their views"
  on public.saved_views for delete
  to authenticated
  using (created_by = (select auth.uid()));
