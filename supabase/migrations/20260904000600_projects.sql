-- Tyriaq — projects
--
-- Workspace → Space → Project. A project always belongs to a space, and a
-- space always belongs to a workspace, so authorization reduces to the one
-- question the whole model turns on: is the caller a member of the
-- workspace? That is why `workspace_id` is denormalised onto the row.
--
-- Without it every policy would have to join through `spaces`, and a join
-- inside a policy runs per row on every read. The trigger below keeps the
-- copy honest, so the denormalisation cannot drift.

create type public.project_status as enum ('on_track', 'at_risk', 'off_track', 'on_hold', 'completed');

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  space_id uuid not null references public.spaces (id) on delete cascade,
  name text not null,
  slug text not null,
  description text not null default '',
  status public.project_status not null default 'on_track',
  color public.space_color not null default 'violet',
  start_date date,
  due_date date,
  archived_at timestamptz,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_name_length check (char_length(name) between 1 and 80),
  constraint projects_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  -- A slug addresses a project inside its workspace, so it only has to be
  -- unique there. Two workspaces may each have a "website" project.
  constraint projects_slug_unique_per_workspace unique (workspace_id, slug),
  constraint projects_dates_ordered check (start_date is null or due_date is null or start_date <= due_date)
);

alter table public.projects enable row level security;

create index projects_space_idx on public.projects (space_id);
create index projects_workspace_idx on public.projects (workspace_id);

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

/*
  Keeps `workspace_id` in step with the project's space.

  A client could otherwise pass a workspace it belongs to alongside a space
  it does not, and the RLS check — which reads `workspace_id` — would pass.
  Deriving the value server-side instead of trusting the payload closes
  that hole and makes the column safe to denormalise.
*/
create or replace function public.projects_sync_workspace()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_workspace uuid;
begin
  select s.workspace_id into owner_workspace
  from public.spaces s
  where s.id = new.space_id;

  if owner_workspace is null then
    raise exception 'Space does not exist' using errcode = 'P0001';
  end if;

  new.workspace_id := owner_workspace;
  return new;
end;
$$;

create trigger projects_sync_workspace
  before insert or update of space_id on public.projects
  for each row execute function public.projects_sync_workspace();

create policy "members read projects in their workspaces"
  on public.projects for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

-- `created_by` is pinned to the caller so a client cannot attribute a
-- project to somebody else. The space must be one they can already see.
create policy "members create projects"
  on public.projects for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.spaces s
      where s.id = space_id and public.is_workspace_member(s.workspace_id)
    )
  );

create policy "members update projects in their workspaces"
  on public.projects for update
  to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- Deletion is permanent and will later cascade to tasks; archiving is the
-- reversible path and stays open to any member through the update policy.
create policy "admins delete projects"
  on public.projects for delete
  to authenticated
  using (public.is_workspace_admin(workspace_id));
