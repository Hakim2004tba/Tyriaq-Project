-- Tyriaq — project membership and progress
--
-- Workspace membership decides what you can SEE. Project membership is a
-- narrower thing: who is actually on this piece of work. Every workspace
-- member can read every project in the workspace; the roster says who is
-- responsible for it.

create type public.project_role as enum ('lead', 'member', 'viewer');

create table public.project_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.project_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

alter table public.project_members enable row level security;

create index project_members_user_idx on public.project_members (user_id);

/*
  A project member must already belong to the workspace.

  Nothing in the schema otherwise stops a client from adding an arbitrary
  user id to a project, which would hand that person a row referencing a
  workspace they were never invited to.
*/
create or replace function public.project_members_check_workspace()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_workspace uuid;
begin
  select p.workspace_id into owner_workspace
  from public.projects p
  where p.id = new.project_id;

  if not exists (
    select 1 from public.workspace_members m
    where m.workspace_id = owner_workspace and m.user_id = new.user_id
  ) then
    raise exception 'That person is not a member of this workspace'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger project_members_check_workspace
  before insert or update on public.project_members
  for each row execute function public.project_members_check_workspace();

/** Is the caller a lead on this project? Definer, for the same
    recursion reason as the workspace helpers. */
create or replace function public.is_project_lead(p uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.project_members pm
    where pm.project_id = p and pm.user_id = auth.uid() and pm.role = 'lead'
  );
$$;

revoke all on function public.is_project_lead(uuid) from public;
grant execute on function public.is_project_lead(uuid) to authenticated;

create policy "members read the roster of projects they can see"
  on public.project_members for select
  to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and public.is_workspace_member(p.workspace_id)
    )
  );

create policy "members manage the roster of projects they can see"
  on public.project_members for insert
  to authenticated
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_id and public.is_workspace_member(p.workspace_id)
    )
  );

create policy "members update roles on projects they can see"
  on public.project_members for update
  to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and public.is_workspace_member(p.workspace_id)
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_id and public.is_workspace_member(p.workspace_id)
    )
  );

create policy "members leave, leads and admins remove others"
  on public.project_members for delete
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_project_lead(project_id)
    or exists (
      select 1 from public.projects p
      where p.id = project_id and public.is_workspace_admin(p.workspace_id)
    )
  );

/*
  Creates a project and makes the caller its lead, in one transaction.

  Same reasoning as `create_workspace`: a project with no lead is nobody's
  responsibility, and doing it in two client round trips leaves an orphan
  behind whenever the second one fails.
*/
create or replace function public.create_project(
  target_space_id uuid,
  project_name text,
  project_slug text,
  project_description text default '',
  project_color public.space_color default 'violet'
)
returns public.projects
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  owner_workspace uuid;
  created public.projects;
begin
  if caller is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select s.workspace_id into owner_workspace
  from public.spaces s where s.id = target_space_id;

  if owner_workspace is null then
    raise exception 'Space does not exist' using errcode = 'P0001';
  end if;

  -- SECURITY DEFINER bypasses RLS, so the membership check that the INSERT
  -- policy would normally apply has to be made explicitly here.
  if not public.is_workspace_member(owner_workspace) then
    raise exception 'Not a member of that workspace' using errcode = '42501';
  end if;

  insert into public.projects (workspace_id, space_id, name, slug, description, color, created_by)
  values (owner_workspace, target_space_id, trim(project_name), lower(trim(project_slug)),
          coalesce(project_description, ''), project_color, caller)
  returning * into created;

  insert into public.project_members (project_id, user_id, role)
  values (created.id, caller, 'lead');

  return created;
end;
$$;

revoke all on function public.create_project(uuid, text, text, text, public.space_color) from public;
grant execute on function public.create_project(uuid, text, text, text, public.space_color) to authenticated;

/** Is this slug free inside the workspace? `projects` is invisible to
    non-members, so a client cannot answer this by querying. */
create or replace function public.project_slug_available(ws uuid, candidate text)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select not exists (
    select 1 from public.projects p
    where p.workspace_id = ws and p.slug = lower(trim(candidate))
  );
$$;

revoke all on function public.project_slug_available(uuid, text) from public;
grant execute on function public.project_slug_available(uuid, text) to authenticated;
