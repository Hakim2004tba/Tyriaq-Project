-- Tyriaq — complete schema, generated from supabase/migrations/.
-- Paste this whole file into the Supabase dashboard SQL editor and run it.
-- Safe to run once on a fresh project; re-running will error on the
-- objects that already exist, which is the intended guard against
-- applying it twice.

-- ============================================================
-- 20260904000100_profiles.sql
-- ============================================================
-- Tyriaq — profiles
--
-- `auth.users` is owned by Supabase and must not be queried directly from
-- application code: it holds credentials and is not safe to expose through
-- RLS. `profiles` is the public mirror — one row per user, created by a
-- trigger so a profile can never be missing for a signed-up account.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_full_name_length check (char_length(full_name) <= 120)
);

alter table public.profiles enable row level security;

-- Any signed-in user may read any profile: names and avatars appear on
-- shared workspace surfaces (members lists, assignees), and scoping reads
-- to shared workspaces would need a recursive policy for no real benefit.
create policy "profiles are readable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "users update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- No INSERT or DELETE policy on purpose: rows are created by the trigger
-- below and removed by the cascade from auth.users. Nothing else should
-- be able to invent or destroy a profile.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

/*
  Creates the profile row for every new account.

  SECURITY DEFINER because it writes to a table the new user has no INSERT
  policy for, and `set search_path = ''` so a malicious schema on the
  caller's search_path cannot shadow the objects this function resolves.
*/
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

/*
  Backfill for accounts that already exist.

  The trigger above only fires on INSERT, so anyone who signed up before
  this migration ran would have no profile — and the app would render them
  as a nameless user with no way to fix it, since `profiles` has no INSERT
  policy. `on conflict do nothing` keeps this safe to re-run.
*/
insert into public.profiles (id, full_name, avatar_url)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'full_name', ''),
  u.raw_user_meta_data ->> 'avatar_url'
from auth.users u
on conflict (id) do nothing;

-- ============================================================
-- 20260904000200_workspaces.sql
-- ============================================================
-- Tyriaq — workspaces
--
-- The tenant boundary. Every space, and later every project and task,
-- hangs off a workspace, and every authorization question in the product
-- ultimately reduces to "is this user a member of this workspace".
--
-- Policies are NOT defined here. They depend on `workspace_members`,
-- which does not exist yet; they are added in the next migration once
-- both tables and the membership helpers are in place.

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspaces_name_length check (char_length(name) between 1 and 80),
  constraint workspaces_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint workspaces_slug_length check (char_length(slug) between 2 and 48)
);

alter table public.workspaces enable row level security;

create index workspaces_created_by_idx on public.workspaces (created_by);

create trigger workspaces_set_updated_at
  before update on public.workspaces
  for each row execute function public.set_updated_at();

-- ============================================================
-- 20260904000300_workspace_members.sql
-- ============================================================
-- Tyriaq — workspace membership and the authorization core.

create type public.workspace_role as enum ('owner', 'admin', 'member');

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.workspace_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

alter table public.workspace_members enable row level security;

create index workspace_members_user_idx on public.workspace_members (user_id);

/*
  Membership helpers.

  These are SECURITY DEFINER for a specific reason, not convenience.

  A policy on `workspace_members` that asks "is the caller a member of
  this workspace?" has to read `workspace_members` — which re-triggers the
  same policy, and Postgres aborts with "infinite recursion detected in
  policy for relation". Running the lookup as the function owner skips RLS
  on that inner read and breaks the cycle.

  `set search_path = ''` is required with SECURITY DEFINER: without it a
  caller could put a malicious schema ahead of `public` and have this
  function resolve to their own table instead.
*/
create or replace function public.is_workspace_member(ws uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.workspace_members m
    where m.workspace_id = ws
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_admin(ws uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.workspace_members m
    where m.workspace_id = ws
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  );
$$;

revoke all on function public.is_workspace_member(uuid) from public;
revoke all on function public.is_workspace_admin(uuid) from public;
grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.is_workspace_admin(uuid) to authenticated;

/* ---------------------------------------------------------------- */
/* workspaces policies (deferred from the previous migration)         */
/* ---------------------------------------------------------------- */

create policy "members read their workspaces"
  on public.workspaces for select
  to authenticated
  using (public.is_workspace_member(id));

create policy "admins update their workspace"
  on public.workspaces for update
  to authenticated
  using (public.is_workspace_admin(id))
  with check (public.is_workspace_admin(id));

create policy "owners delete their workspace"
  on public.workspaces for delete
  to authenticated
  using (
    exists (
      select 1 from public.workspace_members m
      where m.workspace_id = id and m.user_id = auth.uid() and m.role = 'owner'
    )
  );

-- No INSERT policy. A workspace and its first membership must be created
-- together — a workspace with no members would be permanently invisible,
-- since every read policy requires membership. `create_workspace()` in the
-- next migration is the only way in.

/* ---------------------------------------------------------------- */
/* workspace_members policies                                         */
/* ---------------------------------------------------------------- */

create policy "members read the roster of their workspaces"
  on public.workspace_members for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "admins add members"
  on public.workspace_members for insert
  to authenticated
  with check (public.is_workspace_admin(workspace_id));

create policy "admins change roles"
  on public.workspace_members for update
  to authenticated
  using (public.is_workspace_admin(workspace_id))
  with check (public.is_workspace_admin(workspace_id));

-- A member may always remove themselves; admins may remove others.
create policy "admins remove members, and members may leave"
  on public.workspace_members for delete
  to authenticated
  using (user_id = auth.uid() or public.is_workspace_admin(workspace_id));

/*
  Guard: a workspace must never lose its last owner.

  Without this, an owner can demote or remove themselves and leave a
  workspace that nobody can administer, delete, or add members to — an
  unrecoverable state, because every recovery path requires an admin.
*/
create or replace function public.protect_last_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_workspace uuid;
  remaining_owners int;
begin
  target_workspace := coalesce(old.workspace_id, new.workspace_id);

  -- Only demotion or removal of an existing owner can strand a workspace.
  if tg_op = 'UPDATE' and (old.role <> 'owner' or new.role = 'owner') then
    return new;
  end if;
  if tg_op = 'DELETE' and old.role <> 'owner' then
    return old;
  end if;

  select count(*) into remaining_owners
  from public.workspace_members m
  where m.workspace_id = target_workspace
    and m.role = 'owner'
    and m.user_id <> old.user_id;

  if remaining_owners = 0 then
    raise exception 'A workspace must keep at least one owner'
      using errcode = 'P0001';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger workspace_members_protect_last_owner
  before update or delete on public.workspace_members
  for each row execute function public.protect_last_owner();

-- ============================================================
-- 20260904000400_create_workspace_rpc.sql
-- ============================================================
-- Tyriaq — workspace creation
--
-- The only way to create a workspace. `workspaces` deliberately has no
-- INSERT policy: a workspace and its owner membership have to appear
-- together or not at all, because a workspace with no members is
-- invisible to everyone forever.

create or replace function public.create_workspace(
  workspace_name text,
  workspace_slug text
)
returns public.workspaces
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  created public.workspaces;
begin
  if caller is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if coalesce(trim(workspace_name), '') = '' then
    raise exception 'Workspace name is required' using errcode = 'P0001';
  end if;

  insert into public.workspaces (name, slug, created_by)
  values (trim(workspace_name), lower(trim(workspace_slug)), caller)
  returning * into created;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (created.id, caller, 'owner');

  return created;
end;
$$;

revoke all on function public.create_workspace(text, text) from public;
grant execute on function public.create_workspace(text, text) to authenticated;

/*
  Slug availability.

  `workspaces` is only readable by members, so a signed-in user cannot
  discover whether a slug is taken by querying the table — the row is
  invisible to them and the insert would fail with a unique-violation they
  cannot explain. This runs as owner to answer that one question, and
  returns nothing but a boolean.
*/
create or replace function public.workspace_slug_available(candidate text)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select not exists (
    select 1 from public.workspaces w where w.slug = lower(trim(candidate))
  );
$$;

revoke all on function public.workspace_slug_available(text) from public;
grant execute on function public.workspace_slug_available(text) to authenticated;

-- ============================================================
-- 20260904000500_spaces.sql
-- ============================================================
-- Tyriaq — spaces
--
-- Workspace → Space → (Folder) → Project → Task. This migration lands the
-- space layer only; folders and projects arrive with their own phase.
--
-- Authorization is inherited, never duplicated: a space is visible exactly
-- when its workspace is. Copying the membership test into space policies
-- would mean two places to keep in step and two places to get wrong.

create type public.space_color as enum ('violet', 'blue', 'emerald', 'amber', 'rose', 'cyan');

create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  slug text not null,
  description text not null default '',
  icon text not null default 'layers',
  color public.space_color not null default 'violet',
  position int not null default 0,
  archived_at timestamptz,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint spaces_name_length check (char_length(name) between 1 and 80),
  constraint spaces_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  -- Slugs address a space inside its workspace, so they only have to be
  -- unique there — two workspaces may each have a "design" space.
  constraint spaces_slug_unique_per_workspace unique (workspace_id, slug)
);

alter table public.spaces enable row level security;

create index spaces_workspace_idx on public.spaces (workspace_id);

create trigger spaces_set_updated_at
  before update on public.spaces
  for each row execute function public.set_updated_at();

create policy "members read spaces in their workspaces"
  on public.spaces for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

-- Any member may create a space; `created_by` is pinned to the caller so
-- a client cannot attribute a space to someone else.
create policy "members create spaces"
  on public.spaces for insert
  to authenticated
  with check (public.is_workspace_member(workspace_id) and created_by = auth.uid());

create policy "members update spaces in their workspaces"
  on public.spaces for update
  to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- Deletion is destructive and will later cascade to projects and tasks,
-- so it is admin-only. Archiving (setting archived_at) stays open to any
-- member through the update policy above.
create policy "admins delete spaces"
  on public.spaces for delete
  to authenticated
  using (public.is_workspace_admin(workspace_id));

-- ============================================================
-- 20260904000600_projects.sql
-- ============================================================
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

-- ============================================================
-- 20260904000700_project_members.sql
-- ============================================================
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

-- ============================================================
-- 20260904000800_tasks.sql
-- ============================================================
-- Tyriaq — tasks
--
-- Workspace → Space → Project → Task. As with projects, `workspace_id` is
-- denormalised onto the row so every policy answers the one question the
-- model turns on — is the caller a member of this workspace — without a
-- join running per row on every read. A trigger re-derives it from the
-- project, so the copy cannot drift or be forged by a client.

create type public.task_status as enum ('todo', 'in_progress', 'review', 'done', 'blocked');
create type public.task_priority as enum ('low', 'medium', 'high', 'urgent');

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,

  -- Subtasks are tasks with a parent. One table, so a subtask carries the
  -- same fields as anything else and "the same task across every view"
  -- stays literally true rather than a second shape to keep in step.
  parent_task_id uuid references public.tasks (id) on delete cascade,

  title text not null,
  description text not null default '',
  status public.task_status not null default 'todo',
  priority public.task_priority not null default 'medium',
  start_date date,
  due_date date,
  tags text[] not null default '{}',
  is_milestone boolean not null default false,

  /*
    Manual ordering.

    Fractional rather than integer: dropping a task between two others
    writes the midpoint of their positions and touches exactly one row.
    Integer positions would mean renumbering everything below the drop on
    every single move.
  */
  position double precision not null default 0,

  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint tasks_title_length check (char_length(title) between 1 and 200),
  constraint tasks_dates_ordered check (start_date is null or due_date is null or start_date <= due_date),
  constraint tasks_not_own_parent check (parent_task_id is null or parent_task_id <> id)
);

alter table public.tasks enable row level security;

create index tasks_project_idx on public.tasks (project_id);
create index tasks_workspace_idx on public.tasks (workspace_id);
create index tasks_parent_idx on public.tasks (parent_task_id);
create index tasks_position_idx on public.tasks (project_id, position);

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

/*
  Derives `workspace_id` from the project, and keeps subtasks in the same
  project as their parent.

  Both checks close the same hole: a client that could name any project or
  any parent would otherwise be able to attach a row to a workspace it can
  read, while pointing it at one it cannot.
*/
create or replace function public.tasks_sync_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_workspace uuid;
  parent_project uuid;
begin
  select p.workspace_id into owner_workspace
  from public.projects p where p.id = new.project_id;

  if owner_workspace is null then
    raise exception 'Project does not exist' using errcode = 'P0001';
  end if;

  new.workspace_id := owner_workspace;

  if new.parent_task_id is not null then
    select t.project_id into parent_project
    from public.tasks t where t.id = new.parent_task_id;

    if parent_project is null then
      raise exception 'Parent task does not exist' using errcode = 'P0001';
    end if;
    if parent_project <> new.project_id then
      raise exception 'A subtask must live in the same project as its parent'
        using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

create trigger tasks_sync_scope
  before insert or update of project_id, parent_task_id on public.tasks
  for each row execute function public.tasks_sync_scope();

create policy "members read tasks in their workspaces"
  on public.tasks for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "members create tasks"
  on public.tasks for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.projects p
      where p.id = project_id and public.is_workspace_member(p.workspace_id)
    )
  );

create policy "members update tasks in their workspaces"
  on public.tasks for update
  to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- Any member may delete a task. Unlike a space or a project, a task is a
-- small, routine unit of work — requiring an admin to remove one would
-- make the board unusable.
create policy "members delete tasks in their workspaces"
  on public.tasks for delete
  to authenticated
  using (public.is_workspace_member(workspace_id));

-- ============================================================
-- 20260904000900_task_assignees.sql
-- ============================================================
-- Tyriaq — task assignees
--
-- A join table rather than a `tasks.assignee_id` column: a task can carry
-- several people, and the board needs to filter by assignee without
-- unpacking an array.

create table public.task_assignees (
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (task_id, user_id)
);

alter table public.task_assignees enable row level security;

create index task_assignees_user_idx on public.task_assignees (user_id);
create index task_assignees_workspace_idx on public.task_assignees (workspace_id);

/*
  Copies the workspace down from the task, and refuses to assign someone
  who is not in that workspace.

  Without the membership check a member could name any user id at all and
  put a stranger's name on their board — the assignee list is visible to
  everyone who can read the task.
*/
create or replace function public.task_assignees_sync_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_workspace uuid;
begin
  select t.workspace_id into owner_workspace
  from public.tasks t where t.id = new.task_id;

  if owner_workspace is null then
    raise exception 'Task does not exist' using errcode = 'P0001';
  end if;

  new.workspace_id := owner_workspace;

  if not exists (
    select 1 from public.workspace_members m
    where m.workspace_id = owner_workspace and m.user_id = new.user_id
  ) then
    raise exception 'Only workspace members can be assigned to a task'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger task_assignees_sync_scope
  before insert or update on public.task_assignees
  for each row execute function public.task_assignees_sync_scope();

create policy "members read task assignees"
  on public.task_assignees for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "members assign tasks"
  on public.task_assignees for insert
  to authenticated
  with check (
    exists (
      select 1 from public.tasks t
      where t.id = task_id and public.is_workspace_member(t.workspace_id)
    )
  );

create policy "members unassign tasks"
  on public.task_assignees for delete
  to authenticated
  using (public.is_workspace_member(workspace_id));

-- ============================================================
-- 20260904001000_task_dependencies.sql
-- ============================================================
-- Tyriaq — task dependencies
--
-- One row per edge: `predecessor` must finish before `successor` starts.
-- This is what the Gantt view draws its arrows from.

create table public.task_dependencies (
  predecessor_id uuid not null references public.tasks (id) on delete cascade,
  successor_id uuid not null references public.tasks (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (predecessor_id, successor_id),
  constraint task_dependencies_no_self_edge check (predecessor_id <> successor_id)
);

alter table public.task_dependencies enable row level security;

create index task_dependencies_successor_idx on public.task_dependencies (successor_id);
create index task_dependencies_workspace_idx on public.task_dependencies (workspace_id);

/*
  Both ends must be in the same project, and the graph must stay acyclic.

  The cycle check walks the existing edges from the successor: if the
  predecessor is already reachable downstream of it, adding this edge would
  close a loop and the Gantt renderer would never settle.
*/
create or replace function public.task_dependencies_validate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  predecessor_project uuid;
  successor_project uuid;
  predecessor_workspace uuid;
begin
  select t.project_id, t.workspace_id into predecessor_project, predecessor_workspace
  from public.tasks t where t.id = new.predecessor_id;

  select t.project_id into successor_project
  from public.tasks t where t.id = new.successor_id;

  if predecessor_project is null or successor_project is null then
    raise exception 'Both tasks must exist' using errcode = 'P0001';
  end if;

  if predecessor_project <> successor_project then
    raise exception 'Dependencies can only link tasks in the same project'
      using errcode = 'P0001';
  end if;

  new.workspace_id := predecessor_workspace;

  if exists (
    with recursive downstream as (
      select d.successor_id as id
      from public.task_dependencies d
      where d.predecessor_id = new.successor_id
      union
      select d.successor_id
      from public.task_dependencies d
      join downstream w on d.predecessor_id = w.id
    )
    select 1 from downstream where id = new.predecessor_id
  ) then
    raise exception 'That dependency would create a cycle' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger task_dependencies_validate
  before insert or update on public.task_dependencies
  for each row execute function public.task_dependencies_validate();

create policy "members read task dependencies"
  on public.task_dependencies for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "members create task dependencies"
  on public.task_dependencies for insert
  to authenticated
  with check (
    exists (
      select 1 from public.tasks t
      where t.id = predecessor_id and public.is_workspace_member(t.workspace_id)
    )
  );

create policy "members delete task dependencies"
  on public.task_dependencies for delete
  to authenticated
  using (public.is_workspace_member(workspace_id));

-- ============================================================
-- 20260904001100_task_rpc.sql
-- ============================================================
-- Tyriaq — task RPCs
--
-- Drag and drop and progress both need more than a single-row update, so
-- they live here rather than being assembled client-side out of several
-- round trips that could half-apply.

/*
  Places a task between two neighbours, optionally moving it to another
  status column at the same time — which is what a Kanban drop is.

  The caller passes the ids it dropped between rather than a number,
  because only the server knows the current positions; a client computing
  the midpoint from a stale list would collide with a concurrent move.

  Positions are only ever midpoints, so a move rewrites exactly one row.
  Doubles run out of precision after roughly fifty successive drops into
  the same gap, so the function renormalises that column to whole numbers
  when the gap it is handed gets too small to halve meaningfully.
*/
create or replace function public.move_task(
  p_task uuid,
  p_status public.task_status default null,
  p_previous uuid default null,
  p_next uuid default null
)
returns public.tasks
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target public.tasks;
  previous_position double precision;
  next_position double precision;
  new_position double precision;
  target_status public.task_status;
begin
  -- security invoker: this select is subject to RLS, so a caller who
  -- cannot read the task cannot move it either.
  select * into target from public.tasks where id = p_task;
  if target.id is null then
    raise exception 'Task not found' using errcode = 'P0001';
  end if;

  target_status := coalesce(p_status, target.status);

  select position into previous_position from public.tasks
  where id = p_previous and project_id = target.project_id;

  select position into next_position from public.tasks
  where id = p_next and project_id = target.project_id;

  if previous_position is null and next_position is null then
    -- Dropped into an empty column: start a fresh scale.
    new_position := 0;
  elsif previous_position is null then
    new_position := next_position - 1;
  elsif next_position is null then
    new_position := previous_position + 1;
  else
    new_position := (previous_position + next_position) / 2;
  end if;

  update public.tasks
  set position = new_position, status = target_status
  where id = p_task
  returning * into target;

  if previous_position is not null and next_position is not null
     and abs(next_position - previous_position) < 0.000001 then
    perform public.renormalise_task_positions(target.project_id, target_status);
    select * into target from public.tasks where id = p_task;
  end if;

  return target;
end;
$$;

-- Rewrites one column's positions as 0, 1, 2, … preserving current order.
create or replace function public.renormalise_task_positions(
  p_project uuid,
  p_status public.task_status
)
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.tasks t
  set position = ordered.rank
  from (
    select id, (row_number() over (order by position, created_at)) - 1 as rank
    from public.tasks
    where project_id = p_project and status = p_status
  ) ordered
  where t.id = ordered.id and t.position is distinct from ordered.rank;
$$;

/*
  Creates a task at the end of its column in one round trip, so the client
  never has to read the current maximum position and race another writer.
*/
create or replace function public.create_task(
  p_project uuid,
  p_title text,
  p_status public.task_status default 'todo',
  p_priority public.task_priority default 'medium',
  p_parent uuid default null,
  p_start_date date default null,
  p_due_date date default null
)
returns public.tasks
language plpgsql
security invoker
set search_path = ''
as $$
declare
  created public.tasks;
begin
  insert into public.tasks (project_id, workspace_id, title, status, priority,
                            parent_task_id, start_date, due_date, position, created_by)
  values (
    p_project,
    -- Overwritten by tasks_sync_scope; a value is needed for the not-null
    -- column before the trigger replaces it with the authoritative one.
    '00000000-0000-0000-0000-000000000000',
    p_title, p_status, p_priority, p_parent, p_start_date, p_due_date,
    coalesce(
      (select max(position) + 1 from public.tasks
       where project_id = p_project and status = p_status),
      0
    ),
    auth.uid()
  )
  returning * into created;

  return created;
end;
$$;

grant execute on function public.move_task(uuid, public.task_status, uuid, uuid) to authenticated;
grant execute on function public.renormalise_task_positions(uuid, public.task_status) to authenticated;
grant execute on function public.create_task(uuid, text, public.task_status, public.task_priority, uuid, date, date) to authenticated;

-- ============================================================
-- 20260904001200_task_comments.sql
-- ============================================================
-- Tyriaq — task comments
--
-- Comments hang off a task and inherit its workspace, the same way
-- every other task-scoped table does: one denormalised `workspace_id`
-- kept honest by a trigger, so each policy is a single membership
-- question rather than a join executed per row.

create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  /* References `profiles`, not `auth.users`.

     Both are the same identity — a profile row exists for every account
     and is removed with it — but only this one lets the API return a
     comment together with its author in a single query. A foreign key to
     `auth.users` would force a second round trip per screen just to turn
     ids into names. */
  author_id uuid not null references public.profiles (id) on delete cascade,

  body text not null,

  /*
    Who this comment addresses.

    Stored as ids rather than parsed out of the body on read: the body
    holds display names, and a person can be renamed. Ids keep an old
    mention pointing at the same human, and let "mentions of me" be an
    index lookup instead of a text scan.
  */
  mentions uuid[] not null default '{}',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Distinct from `updated_at`, which any future system write would also
  -- touch. This one means a person edited what they said, and is what
  -- the "edited" marker in the panel reads.
  edited_at timestamptz,

  constraint task_comments_body_length check (char_length(body) between 1 and 10000)
);

alter table public.task_comments enable row level security;

create index task_comments_task_idx on public.task_comments (task_id, created_at);
create index task_comments_workspace_idx on public.task_comments (workspace_id);
create index task_comments_mentions_idx on public.task_comments using gin (mentions);

create trigger task_comments_set_updated_at
  before update on public.task_comments
  for each row execute function public.set_updated_at();

/*
  Stamps the workspace from the task, and drops any mention of somebody
  who is not in that workspace — a mention is a claim that a colleague is
  involved, and it should not be possible to attach a stranger's id to a
  task by hand-writing the array.
*/
create or replace function public.task_comments_sync_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_workspace uuid;
begin
  select t.workspace_id into owner_workspace
  from public.tasks t where t.id = new.task_id;

  if owner_workspace is null then
    raise exception 'Task does not exist' using errcode = 'P0001';
  end if;

  new.workspace_id := owner_workspace;

  new.mentions := coalesce(
    (
      select array_agg(distinct m.user_id)
      from public.workspace_members m
      where m.workspace_id = owner_workspace
        and m.user_id = any (new.mentions)
    ),
    '{}'::uuid[]
  );

  return new;
end;
$$;

create trigger task_comments_sync_scope
  before insert or update of task_id, mentions on public.task_comments
  for each row execute function public.task_comments_sync_scope();

-- Everyone in the workspace reads the discussion; only its author may
-- change or remove what they said. A comment is a record of what a
-- person actually wrote, so nobody else gets to rewrite it — not even a
-- workspace admin.
create policy "members read task comments"
  on public.task_comments for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "members write task comments"
  on public.task_comments for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.tasks t
      where t.id = task_id and public.is_workspace_member(t.workspace_id)
    )
  );

create policy "authors edit their own comments"
  on public.task_comments for update
  to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

/*
  Deletion is the author's, or a workspace admin's.

  Editing stays with the author alone — an admin rewriting someone's
  words would leave a false record under their name — but removing
  something abusive is exactly the job moderation exists for.
*/
create policy "authors and admins delete comments"
  on public.task_comments for delete
  to authenticated
  using (author_id = auth.uid() or public.is_workspace_admin(workspace_id));

-- ============================================================
-- 20260904001300_task_attachments.sql
-- ============================================================
-- Tyriaq — task attachments
--
-- The FILE lives in Supabase Storage; this table is the metadata that
-- makes it a first-class thing in the product — who attached it, when,
-- to which task, and under what name. Storage alone cannot answer those
-- questions without turning object paths into a database.

create table public.task_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  -- `profiles`, not `auth.users`, so the API can return the uploader
  -- alongside the file. See the note in the comments migration.
  uploaded_by uuid not null references public.profiles (id) on delete cascade,

  /* Path inside the `task-files` bucket: `<workspace>/<task>/<uuid>.<ext>`.
     The leading segment is what the storage policies read to decide
     access, so it must stay the workspace that owns the row. */
  storage_path text not null unique,

  -- The name the person uploaded it under. Kept separate from the path,
  -- which is a uuid so two people uploading "final.pdf" cannot collide
  -- and no filename ever has to be sanitised into a URL.
  file_name text not null,
  mime_type text not null default 'application/octet-stream',
  size_bytes bigint not null default 0,

  created_at timestamptz not null default now(),

  constraint task_attachments_name_length check (char_length(file_name) between 1 and 255),
  constraint task_attachments_size check (size_bytes >= 0 and size_bytes <= 26214400)
);

alter table public.task_attachments enable row level security;

create index task_attachments_task_idx on public.task_attachments (task_id, created_at);
create index task_attachments_workspace_idx on public.task_attachments (workspace_id);

/*
  Stamps the workspace from the task and forces the storage path to
  begin with it.

  The storage policies grant access by reading that first path segment.
  If a row could claim a path under another workspace's prefix, this
  table would become a way to hand out reads the storage layer believes
  are legitimate.
*/
create or replace function public.task_attachments_sync_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_workspace uuid;
begin
  select t.workspace_id into owner_workspace
  from public.tasks t where t.id = new.task_id;

  if owner_workspace is null then
    raise exception 'Task does not exist' using errcode = 'P0001';
  end if;

  new.workspace_id := owner_workspace;

  if split_part(new.storage_path, '/', 1) <> owner_workspace::text
     or split_part(new.storage_path, '/', 2) <> new.task_id::text then
    raise exception 'An attachment must be stored under its own workspace and task'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger task_attachments_sync_scope
  before insert or update on public.task_attachments
  for each row execute function public.task_attachments_sync_scope();

create policy "members read task attachments"
  on public.task_attachments for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "members attach files"
  on public.task_attachments for insert
  to authenticated
  with check (
    uploaded_by = auth.uid()
    and exists (
      select 1 from public.tasks t
      where t.id = task_id and public.is_workspace_member(t.workspace_id)
    )
  );

-- Uploader or admin, matching comments: removing a file someone else
-- attached is moderation, not editing.
create policy "uploaders and admins remove attachments"
  on public.task_attachments for delete
  to authenticated
  using (uploaded_by = auth.uid() or public.is_workspace_admin(workspace_id));

-- ============================================================
-- 20260904001400_task_activity.sql
-- ============================================================
-- Tyriaq — task activity history
--
-- Written by TRIGGERS, never by the client.
--
-- An activity feed the application writes is a feed of what the
-- application remembered to write: any path that updates a task without
-- logging — a fix run in the SQL editor, a future server job, a screen
-- somebody adds next year — leaves a silent gap in the record. Deriving
-- it from the row changes themselves makes the history a consequence of
-- the data rather than a parallel account of it.

create type public.task_activity_kind as enum (
  'created', 'status', 'assigned', 'due', 'attached', 'commented', 'logged'
);

create table public.task_activity (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,

  -- Nullable: a row can outlive the account that caused it, and losing
  -- the whole entry would rewrite history rather than anonymise it.
  actor_id uuid references public.profiles (id) on delete set null,

  kind public.task_activity_kind not null,
  -- Reads after the actor's name: "Amina moved this to In review".
  text text not null,
  detail text,
  created_at timestamptz not null default now()
);

alter table public.task_activity enable row level security;

create index task_activity_task_idx on public.task_activity (task_id, created_at);
create index task_activity_workspace_idx on public.task_activity (workspace_id);

-- Read-only to everyone. There is deliberately no insert, update or
-- delete policy: the trigger functions below are SECURITY DEFINER and so
-- write past RLS, which means the history cannot be edited or quietly
-- pruned through the API by anyone at all.
create policy "members read task activity"
  on public.task_activity for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create or replace function public.log_task_activity(
  p_task uuid,
  p_workspace uuid,
  p_kind public.task_activity_kind,
  p_text text,
  p_detail text default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.task_activity (task_id, workspace_id, actor_id, kind, text, detail)
  values (p_task, p_workspace, auth.uid(), p_kind, p_text, p_detail);
$$;

/* ------------------------------------------------------------------ */
/* Task lifecycle                                                      */
/* ------------------------------------------------------------------ */

create or replace function public.tasks_log_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  status_label text;
begin
  if tg_op = 'INSERT' then
    perform public.log_task_activity(
      new.id, new.workspace_id, 'created',
      case when new.parent_task_id is null then 'created this task' else 'added this subtask' end
    );
    return new;
  end if;

  if new.status is distinct from old.status then
    status_label := case new.status
      when 'todo' then 'To do'
      when 'in_progress' then 'In progress'
      when 'review' then 'In review'
      when 'done' then 'Done'
      when 'blocked' then 'Blocked'
    end;
    perform public.log_task_activity(
      new.id, new.workspace_id, 'status',
      'moved this to ' || status_label
    );
  end if;

  if new.due_date is distinct from old.due_date then
    perform public.log_task_activity(
      new.id, new.workspace_id, 'due',
      case
        when new.due_date is null then 'cleared the due date'
        when old.due_date is null then 'set the due date'
        else 'moved the due date'
      end,
      to_char(new.due_date, 'FMDay FMDD Mon YYYY')
    );
  end if;

  -- Priority shares the 'status' icon rather than earning its own: both
  -- answer "how is this task being treated now", and a seventh symbol in
  -- the timeline buys less than it costs to read.
  if new.priority is distinct from old.priority then
    perform public.log_task_activity(
      new.id, new.workspace_id, 'status',
      'set priority to ' || initcap(new.priority::text)
    );
  end if;

  return new;
end;
$$;

create trigger tasks_log_activity
  after insert or update of status, due_date, priority on public.tasks
  for each row execute function public.tasks_log_activity();

/* ------------------------------------------------------------------ */
/* Assignment, comments, attachments                                   */
/* ------------------------------------------------------------------ */

create or replace function public.task_assignees_log_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_name text;
  target_id uuid;
  workspace uuid;
  task uuid;
begin
  if tg_op = 'INSERT' then
    target_id := new.user_id; workspace := new.workspace_id; task := new.task_id;
  else
    target_id := old.user_id; workspace := old.workspace_id; task := old.task_id;
  end if;

  select coalesce(nullif(p.full_name, ''), 'someone') into target_name
  from public.profiles p where p.id = target_id;

  perform public.log_task_activity(
    task, workspace, 'assigned',
    case
      when tg_op = 'INSERT' and target_id = auth.uid() then 'took this on'
      when tg_op = 'INSERT' then 'assigned ' || coalesce(target_name, 'someone')
      when target_id = auth.uid() then 'stepped off this task'
      else 'unassigned ' || coalesce(target_name, 'someone')
    end
  );

  return null;
end;
$$;

create trigger task_assignees_log_activity
  after insert or delete on public.task_assignees
  for each row execute function public.task_assignees_log_activity();

create or replace function public.task_comments_log_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Only the first posting is logged. An edit is already visible on the
  -- comment itself, and a timeline that repeats "commented" for every
  -- typo correction buries everything else.
  perform public.log_task_activity(new.task_id, new.workspace_id, 'commented', 'left a comment');
  return null;
end;
$$;

create trigger task_comments_log_activity
  after insert on public.task_comments
  for each row execute function public.task_comments_log_activity();

create or replace function public.task_attachments_log_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_task_activity(
      new.task_id, new.workspace_id, 'attached', 'attached a file', new.file_name
    );
  else
    perform public.log_task_activity(
      old.task_id, old.workspace_id, 'attached', 'removed a file', old.file_name
    );
  end if;
  return null;
end;
$$;

create trigger task_attachments_log_activity
  after insert or delete on public.task_attachments
  for each row execute function public.task_attachments_log_activity();

-- ============================================================
-- 20260904001500_storage.sql
-- ============================================================
-- Tyriaq — file storage
--
-- One private bucket for every task attachment. Private, not public:
-- a public bucket hands out a permanent unguessable URL, which survives
-- being removed from a task, leaving the workspace, or losing access
-- entirely. Files are reached through short-lived signed URLs minted for
-- a caller the database has just checked.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('task-files', 'task-files', false, 26214400, null)
on conflict (id) do nothing;

/*
  Paths are `<workspace_id>/<task_id>/<uuid>.<ext>`.

  Putting the workspace first is what makes access a single question the
  existing helper already answers, with no join from an object back to a
  task. `is_workspace_member` is SECURITY DEFINER, so it works here even
  though storage.objects is a different schema.
*/
create policy "members read task files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'task-files'
    and public.is_workspace_member(nullif(split_part(name, '/', 1), '')::uuid)
  );

create policy "members upload task files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'task-files'
    and owner = auth.uid()
    and public.is_workspace_member(nullif(split_part(name, '/', 1), '')::uuid)
  );

-- No update policy: an attachment is a fixed artefact. Replacing a file
-- in place would change what everyone else already read, under the same
-- name and timestamp, with nothing in the history to show it happened.

create policy "uploaders and admins delete task files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'task-files'
    and (
      owner = auth.uid()
      or public.is_workspace_admin(nullif(split_part(name, '/', 1), '')::uuid)
    )
  );

-- ============================================================
-- 20260904001600_realtime.sql
-- ============================================================
-- Tyriaq — realtime
--
-- Comments, activity and attachments are broadcast; tasks are not.
--
-- Those three are append-mostly records of what people did, where
-- another person's row appearing under yours is the entire point. A task
-- row is different: it is being dragged, typed into and optimistically
-- updated locally, and a stream of remote patches landing mid-gesture
-- would fight the person holding the mouse. Task changes still surface
-- through the activity feed, which is the honest place for them.
--
-- Realtime respects RLS for `authenticated` subscribers, so a client only
-- receives rows it could already have read.

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.task_comments;
    alter publication supabase_realtime add table public.task_activity;
    alter publication supabase_realtime add table public.task_attachments;
  end if;
end $$;

/*
  Deletes carry only the primary key by default, which is enough to drop
  a comment from a list that already holds it. Full replica identity
  would put the entire deleted row — its body included — onto the wire
  for every subscriber, so it stays off.
*/

-- ============================================================
-- 20260904001700_assignee_profile_fk.sql
-- ============================================================
-- Tyriaq — let assignees be read with their names
--
-- `task_assignees.user_id` references `auth.users`, which is correct but
-- opaque to the API: there is no relationship from it to `profiles`, so
-- a board cannot ask for its assignees and their names in one query and
-- has to follow up with a second lookup per screen.
--
-- Adding the second key alongside the first states the relationship the
-- API needs without weakening the one that guarantees the account
-- exists. Every `profiles` row is keyed to an `auth.users` row, so the
-- two can never disagree.

alter table public.task_assignees
  add constraint task_assignees_user_id_profile_fkey
  foreign key (user_id) references public.profiles (id) on delete cascade;

-- ============================================================
-- 20260904001800_profile_relationships.sql
-- ============================================================
-- Tyriaq — make every person column readable through the API
--
-- Several tables key their person columns to `auth.users`. That is
-- correct as a constraint and useless as a relationship: `auth.users` is
-- not exposed through the API, so a query asking for a project together
-- with its members' names finds no path between the two tables and
-- FAILS — not returning fewer rows, but an error, which the application
-- read as "no projects".
--
-- `profiles` is the same identity: exactly one row per account, created
-- by a trigger at signup and removed with the account. Keying to it as
-- well states the relationship the API needs without weakening the one
-- that guarantees the account exists.
--
-- Every step asks what the database actually has rather than assuming a
-- history, so this is safe on a fresh project, on one built from an
-- earlier draft, and safe to run twice.

-- A missing profile would make the new keys unaddable. `handle_new_user`
-- creates one per signup, but an account that predates that trigger — or
-- one made straight in the dashboard — has none.
insert into public.profiles (id, full_name, avatar_url)
select u.id, coalesce(u.raw_user_meta_data ->> 'full_name', ''), u.raw_user_meta_data ->> 'avatar_url'
from auth.users u
on conflict (id) do nothing;

/*
  Adds a key from `tbl.col` to `profiles`, unless one is already there.

  The test is on where the constraint POINTS, not on what it is called.
  Testing the name would add a second, identically-shaped key to a table
  that is already correct — and two paths between the same pair of tables
  make the embed ambiguous, breaking exactly what this is meant to fix.
*/
create or replace function pg_temp.ensure_profile_fk(tbl text, col text, on_delete text)
returns void
language plpgsql
as $$
declare
  already boolean;
begin
  select exists (
    select 1
    from pg_constraint c
    join pg_class referenced on referenced.oid = c.confrelid
    join pg_namespace rn on rn.oid = referenced.relnamespace
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
    where c.contype = 'f'
      and c.conrelid = ('public.' || tbl)::regclass
      and rn.nspname = 'public'
      and referenced.relname = 'profiles'
      and a.attname = col
  ) into already;

  if already then
    raise notice '% .% already reaches profiles', tbl, col;
    return;
  end if;

  execute format(
    'alter table public.%I add constraint %I foreign key (%I) references public.profiles (id) on delete %s',
    tbl, tbl || '_' || col || '_profile_fkey', col, on_delete
  );
  raise notice 'linked %.% to profiles', tbl, col;
end;
$$;

select pg_temp.ensure_profile_fk('workspace_members', 'user_id',     'cascade');
select pg_temp.ensure_profile_fk('project_members',   'user_id',     'cascade');
select pg_temp.ensure_profile_fk('task_assignees',    'user_id',     'cascade');
select pg_temp.ensure_profile_fk('task_comments',     'author_id',   'cascade');
select pg_temp.ensure_profile_fk('task_attachments',  'uploaded_by', 'cascade');
select pg_temp.ensure_profile_fk('task_activity',     'actor_id',    'set null');

-- PostgREST caches the relationships it knows about. Without this it
-- keeps answering "no relationship found" until the project restarts or
-- it happens to reload on its own.
notify pgrst, 'reload schema';

-- ============================================================
-- 20260904001900_storage_owner.sql
-- ============================================================
-- Tyriaq — storage policies that do not depend on which owner column
-- this Supabase version has.
--
-- The original policies asked `owner = auth.uid()`. Supabase has been
-- moving object ownership from `owner` (uuid) to `owner_id` (text), and
-- a project where `owner` is no longer populated would refuse every
-- upload — with the storage API reporting only "new row violates
-- row-level security policy", which says nothing about which column is
-- to blame.
--
-- So: uploading is gated on the path prefix alone, which is the real
-- boundary — the leading segment is the workspace, and only its members
-- may write there. Ownership then decides deletion, read from whichever
-- column this installation actually has.

drop policy if exists "members upload task files" on storage.objects;
drop policy if exists "uploaders and admins delete task files" on storage.objects;

/*
  Uploads: workspace membership, by path.

  Dropping the owner condition does not widen who may write — the same
  people could always write here — it only stops the check depending on
  a column whose meaning is in flux. Who uploaded what is recorded in
  `task_attachments.uploaded_by`, from `auth.uid()`, which is the copy
  the product actually reads.
*/
create policy "members upload task files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'task-files'
    and public.is_workspace_member(nullif(split_part(name, '/', 1), '')::uuid)
  );

do $$
declare
  owner_test text;
begin
  -- Whichever column exists is used; where both do, either matching is
  -- enough, so the policy keeps working across an upgrade in either
  -- direction rather than only after one.
  owner_test := concat_ws(' or ',
    case when exists (
      select 1 from pg_attribute
      where attrelid = 'storage.objects'::regclass and attname = 'owner' and not attisdropped
    ) then 'owner = auth.uid()' end,
    case when exists (
      select 1 from pg_attribute
      where attrelid = 'storage.objects'::regclass and attname = 'owner_id' and not attisdropped
    ) then 'owner_id = auth.uid()::text' end
  );

  if owner_test = '' then
    -- Neither column: fall back to workspace admin, so files stay
    -- removable rather than becoming permanent.
    owner_test := 'false';
  end if;

  execute format($f$
    create policy "uploaders and admins delete task files"
      on storage.objects for delete
      to authenticated
      using (
        bucket_id = 'task-files'
        and (
          (%s)
          or public.is_workspace_admin(nullif(split_part(name, '/', 1), '')::uuid)
        )
      )
  $f$, owner_test);
end $$;

notify pgrst, 'reload schema';

-- ============================================================
-- 20260905000100_documents.sql
-- ============================================================
-- Tyriaq — documents
--
-- A document belongs to a workspace, optionally sits in a folder, and
-- optionally belongs to a project. All three are nullable-or-not in the
-- way the product reads: workspace always, folder and project only when
-- somebody has filed it.
--
-- Content is stored as JSONB rather than HTML or Markdown. The editor's
-- document model is a tree, and keeping it as one means a task
-- reference is a NODE with an id — not a string that has to be parsed
-- back out — which is what lets the database see which documents point
-- at which tasks.

create table public.document_folders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  -- Folders nest. `on delete cascade` would silently take a whole
  -- subtree with the parent, so children are lifted to the root instead
  -- and stay findable.
  parent_id uuid references public.document_folders (id) on delete set null,
  name text not null,
  position double precision not null default 0,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint document_folders_name_length check (char_length(name) between 1 and 120),
  constraint document_folders_not_own_parent check (parent_id is null or parent_id <> id)
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  folder_id uuid references public.document_folders (id) on delete set null,
  -- Deleting a project takes its documents with it: a project doc is
  -- about that project, and orphaning it leaves a page nobody can place.
  project_id uuid references public.projects (id) on delete cascade,

  title text not null default 'Untitled',
  /* TipTap/ProseMirror JSON. `{"type":"doc","content":[]}` is an empty
     document — distinct from SQL NULL, which would mean "never saved". */
  content jsonb not null default '{"type":"doc","content":[]}'::jsonb,

  archived_at timestamptz,
  created_by uuid not null references public.profiles (id) on delete cascade,
  -- Who touched it last, for "edited by X" without reading a history.
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint documents_title_length check (char_length(title) between 1 and 200),
  constraint documents_content_is_doc check (content ->> 'type' = 'doc')
);

alter table public.document_folders enable row level security;
alter table public.documents enable row level security;

create index document_folders_workspace_idx on public.document_folders (workspace_id);
create index document_folders_parent_idx on public.document_folders (parent_id);
create index documents_workspace_idx on public.documents (workspace_id, updated_at desc);
create index documents_folder_idx on public.documents (folder_id);
create index documents_project_idx on public.documents (project_id);

create trigger document_folders_set_updated_at
  before update on public.document_folders
  for each row execute function public.set_updated_at();

create trigger documents_set_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

/*
  Keeps a document's workspace honest.

  When it belongs to a project, the workspace is the project's — derived,
  not trusted, exactly as tasks do it. A folder must belong to the same
  workspace, or a document could be filed into a folder its readers
  cannot see.
*/
create or replace function public.documents_sync_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  project_workspace uuid;
  folder_workspace uuid;
begin
  if new.project_id is not null then
    select p.workspace_id into project_workspace
    from public.projects p where p.id = new.project_id;

    if project_workspace is null then
      raise exception 'Project does not exist' using errcode = 'P0001';
    end if;
    new.workspace_id := project_workspace;
  end if;

  if new.folder_id is not null then
    select f.workspace_id into folder_workspace
    from public.document_folders f where f.id = new.folder_id;

    if folder_workspace is null then
      raise exception 'Folder does not exist' using errcode = 'P0001';
    end if;
    if folder_workspace <> new.workspace_id then
      raise exception 'A document and its folder must be in the same workspace'
        using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

create trigger documents_sync_scope
  before insert or update of project_id, folder_id, workspace_id on public.documents
  for each row execute function public.documents_sync_scope();

/*
  Folder nesting must stay a tree.

  Without this, dragging a folder into its own descendant would close a
  loop, and the sidebar — which walks parents to build the tree — would
  recurse until the browser gave up.
*/
create or replace function public.document_folders_validate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  ancestor uuid := new.parent_id;
  guard int := 0;
  parent_workspace uuid;
begin
  if new.parent_id is not null then
    select f.workspace_id into parent_workspace
    from public.document_folders f where f.id = new.parent_id;

    if parent_workspace is null then
      raise exception 'Parent folder does not exist' using errcode = 'P0001';
    end if;
    if parent_workspace <> new.workspace_id then
      raise exception 'A folder and its parent must be in the same workspace'
        using errcode = 'P0001';
    end if;
  end if;

  while ancestor is not null loop
    if ancestor = new.id then
      raise exception 'A folder cannot be moved inside itself' using errcode = 'P0001';
    end if;
    guard := guard + 1;
    if guard > 64 then
      raise exception 'Folder nesting is too deep' using errcode = 'P0001';
    end if;
    select f.parent_id into ancestor from public.document_folders f where f.id = ancestor;
  end loop;

  return new;
end;
$$;

create trigger document_folders_validate
  before insert or update of parent_id, workspace_id on public.document_folders
  for each row execute function public.document_folders_validate();

/* ------------------------------------------------------------------ */
/* Policies                                                            */
/* ------------------------------------------------------------------ */

create policy "members read document folders"
  on public.document_folders for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "members create document folders"
  on public.document_folders for insert
  to authenticated
  with check (created_by = auth.uid() and public.is_workspace_member(workspace_id));

create policy "members update document folders"
  on public.document_folders for update
  to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- Deleting a folder does not delete its documents — they fall back to
-- the root — so this stays open to any member, like renaming it.
create policy "members delete document folders"
  on public.document_folders for delete
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "members read documents"
  on public.documents for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "members create documents"
  on public.documents for insert
  to authenticated
  with check (created_by = auth.uid() and public.is_workspace_member(workspace_id));

-- Anyone in the workspace may edit any document. That is what a
-- collaborative wiki means; per-document permissions would need a
-- sharing model this product does not have yet, and pretending to
-- enforce one here would be worse than not having it.
create policy "members update documents"
  on public.documents for update
  to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

/*
  Permanent deletion is the author's or an admin's; archiving is an
  UPDATE and stays open to everyone. The reversible path is the one
  everybody has.
*/
create policy "authors and admins delete documents"
  on public.documents for delete
  to authenticated
  using (created_by = auth.uid() or public.is_workspace_admin(workspace_id));

-- ============================================================
-- 20260905000200_document_task_links.sql
-- ============================================================
-- Tyriaq — task references inside documents
--
-- A document does not copy a task. It holds a node carrying the task's
-- id, and the task's title, status and assignees are read from `tasks`
-- when the document is rendered — so renaming a task updates every
-- document mentioning it, and closing one shows as closed everywhere.
--
-- This table is the reverse index of those nodes, maintained by a
-- trigger. It exists so "which documents reference this task" is a
-- lookup rather than a scan of every document body in the workspace,
-- and so a task can eventually show its own list of mentions.

create table public.document_task_links (
  document_id uuid not null references public.documents (id) on delete cascade,
  task_id uuid not null references public.tasks (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  primary key (document_id, task_id)
);

alter table public.document_task_links enable row level security;

create index document_task_links_task_idx on public.document_task_links (task_id);
create index document_task_links_workspace_idx on public.document_task_links (workspace_id);

/*
  Every task id appearing as a `taskLink` node, anywhere in the tree.

  A jsonb path query rather than a recursive walk in PL/pgSQL: the
  document is a tree of unknown depth, and `jsonb_path_query` descends it
  in one pass inside the server.
*/
create or replace function public.document_task_ids(body jsonb)
returns setof uuid
language sql
immutable
set search_path = ''
as $$
  select distinct (value #>> '{}')::uuid
  from jsonb_path_query(
    body,
    '$.**.attrs.id ? (@ != null)'
  ) as value
  where value #>> '{}' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and exists (
      select 1
      from jsonb_path_query(body, '$.**') as node
      where node -> 'attrs' ->> 'id' = value #>> '{}'
        and node ->> 'type' = 'taskLink'
    );
$$;

/*
  Rewrites the index whenever a document's body changes.

  Deleting and reinserting rather than diffing: a document has a handful
  of references, the write happens once per save, and a diff would be
  more code to get subtly wrong for no measurable gain.

  Rows are only written for tasks that exist in the SAME workspace. A
  document cannot manufacture a link to a task its readers cannot see,
  even if somebody pastes a foreign id into the body by hand.
*/
create or replace function public.documents_sync_task_links()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.document_task_links where document_id = new.id;

  insert into public.document_task_links (document_id, task_id, workspace_id)
  select new.id, t.id, new.workspace_id
  from public.document_task_ids(new.content) as referenced(id)
  join public.tasks t on t.id = referenced.id and t.workspace_id = new.workspace_id;

  return null;
end;
$$;

create trigger documents_sync_task_links
  after insert or update of content, workspace_id on public.documents
  for each row execute function public.documents_sync_task_links();

-- Read-only to clients: the index is derived from document bodies, and
-- letting anyone write it directly would let a row claim a reference the
-- document does not contain.
create policy "members read document task links"
  on public.document_task_links for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

-- ============================================================
-- 20260905000300_document_images.sql
-- ============================================================
-- Tyriaq — images inside documents
--
-- A separate bucket from task attachments: the lifecycles differ (an
-- image belongs to a body of text, not to a piece of work) and one
-- prefix per concern keeps the storage policies readable.
--
-- Private, like `task-files`. Documents render images through short-lived
-- signed URLs resolved when the page loads, so an image pasted into a
-- private document does not become a permanent public link the moment
-- somebody copies its address.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('document-images', 'document-images', false, 10485760,
        array['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'])
on conflict (id) do nothing;

-- Paths are `<workspace_id>/<document_id>/<uuid>.<ext>`, so access is the
-- same single membership question the rest of the schema asks.
create policy "members read document images"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'document-images'
    and public.is_workspace_member(nullif(split_part(name, '/', 1), '')::uuid)
  );

create policy "members upload document images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'document-images'
    and public.is_workspace_member(nullif(split_part(name, '/', 1), '')::uuid)
  );

-- Any member may remove one. Unlike an attachment, an image is part of a
-- document everybody may already edit — being able to delete the picture
-- but not the paragraph around it would be a strange half-permission.
create policy "members delete document images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'document-images'
    and public.is_workspace_member(nullif(split_part(name, '/', 1), '')::uuid)
  );

-- ============================================================
-- 20260905000400_document_realtime.sql
-- ============================================================
-- Tyriaq — documents on the realtime channel
--
-- Only so an open editor can be TOLD that somebody else saved. The
-- payload is not applied to the page: without a merge strategy, applying
-- a remote body would throw away whatever the reader has typed since.
--
-- This is the honest half of collaborative editing that the current
-- architecture can support — detecting a conflict — as distinct from
-- resolving one, which needs a CRDT and a server that can merge.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'documents'
    ) then
      alter publication supabase_realtime add table public.documents;
    end if;
  end if;
end $$;

-- ============================================================
-- 20260905000500_conversations.sql
-- ============================================================
-- Tyriaq — conversations
--
-- Three kinds, one table:
--
--   dm      two people, created on demand and never duplicated
--   group   a named conversation with an explicit roster
--   project a channel attached to a project, open to the workspace
--
-- They share a table because a message does not care which it is in, and
-- splitting them would mean three of every query, three policies and
-- three unread counts that could drift apart.

create type public.conversation_kind as enum ('dm', 'group', 'project');

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  kind public.conversation_kind not null,

  -- Groups are named; a DM is titled by whoever you are talking to, and
  -- a project channel by its project, so neither stores one.
  title text,
  project_id uuid references public.projects (id) on delete cascade,

  /*
    The two participants of a DM, ordered, as one string.

    A unique index on this is what stops a second DM appearing between
    the same pair — two people opening each other at the same moment
    would otherwise each create one, and the conversation would silently
    fork in two.
  */
  dm_key text,

  -- Denormalised from `messages` by a trigger. Sorting the conversation
  -- list by "most recent activity" is the single most common read in a
  -- chat product, and doing it as a correlated subquery over messages
  -- would cost a scan per row on every render.
  last_message_at timestamptz,

  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint conversations_title_length check (title is null or char_length(title) between 1 and 120),
  constraint conversations_group_is_named check (kind <> 'group' or title is not null),
  constraint conversations_project_has_project check ((kind = 'project') = (project_id is not null)),
  constraint conversations_dm_has_key check ((kind = 'dm') = (dm_key is not null))
);

create unique index conversations_dm_unique on public.conversations (workspace_id, dm_key)
  where dm_key is not null;
create unique index conversations_project_unique on public.conversations (project_id)
  where project_id is not null;
create index conversations_workspace_idx on public.conversations (workspace_id, last_message_at desc nulls last);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,

  /*
    How far this person has read.

    A timestamp rather than a message id: it answers "how many since"
    with a range scan on an index that already exists, and it does not
    break when the message it pointed at is deleted.
  */
  last_read_at timestamptz not null default now(),
  muted boolean not null default false,
  joined_at timestamptz not null default now(),

  primary key (conversation_id, user_id)
);

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;

create index conversation_members_user_idx on public.conversation_members (user_id);
create index conversation_members_workspace_idx on public.conversation_members (workspace_id);

create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

/*
  Is the caller in this conversation?

  SECURITY DEFINER for the same reason `is_workspace_member` is: a policy
  on `conversation_members` that asks this question has to read
  `conversation_members`, which re-triggers the policy and aborts with
  "infinite recursion detected in policy". Running the lookup as the
  owner reads the table once, with policies off, and answers.
*/
create or replace function public.is_conversation_member(target uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.conversation_members m
    where m.conversation_id = target and m.user_id = auth.uid()
  );
$$;

/*
  Can the caller SEE this conversation?

  A project channel is open to everyone in the workspace — that is what
  makes it a channel rather than a group — while a DM or a group is
  visible only to the people in it. Both halves are asked here, once, so
  every policy that needs the answer stays a single function call.
*/
create or replace function public.can_read_conversation(target uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.conversations c
    where c.id = target
      and (
        (c.kind = 'project' and public.is_workspace_member(c.workspace_id))
        or public.is_conversation_member(c.id)
      )
  );
$$;

grant execute on function public.is_conversation_member(uuid) to authenticated;
grant execute on function public.can_read_conversation(uuid) to authenticated;

create policy "participants read conversations"
  on public.conversations for select
  to authenticated
  using (public.can_read_conversation(id));

-- Created only through the RPCs below, which make the conversation and
-- its roster in one statement. A conversation with no members would be
-- invisible to everyone the moment it existed, including its author.
create policy "participants rename group conversations"
  on public.conversations for update
  to authenticated
  using (kind = 'group' and public.is_conversation_member(id))
  with check (kind = 'group' and public.is_conversation_member(id));

create policy "participants read the roster"
  on public.conversation_members for select
  to authenticated
  using (public.can_read_conversation(conversation_id));

/*
  Adding people is for members of the conversation — a group's roster is
  its own business — and the person added must already be in the
  workspace, checked by the trigger below.
*/
create policy "participants add people"
  on public.conversation_members for insert
  to authenticated
  with check (
    public.is_conversation_member(conversation_id)
    or (
      -- Joining a project channel yourself needs no invitation; it is
      -- open to the workspace already.
      user_id = auth.uid()
      and exists (
        select 1 from public.conversations c
        where c.id = conversation_id and c.kind = 'project'
          and public.is_workspace_member(c.workspace_id)
      )
    )
  );

-- Only your own row: marking a conversation read, or muting it, is a
-- personal setting and nobody else's to change.
create policy "people update their own membership"
  on public.conversation_members for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "people leave, and groups remove"
  on public.conversation_members for delete
  to authenticated
  using (user_id = auth.uid() or public.is_conversation_member(conversation_id));

/*
  A conversation's members must be in its workspace, and the workspace is
  taken from the conversation rather than the caller.
*/
create or replace function public.conversation_members_sync_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_workspace uuid;
begin
  select c.workspace_id into owner_workspace
  from public.conversations c where c.id = new.conversation_id;

  if owner_workspace is null then
    raise exception 'Conversation does not exist' using errcode = 'P0001';
  end if;

  new.workspace_id := owner_workspace;

  if not exists (
    select 1 from public.workspace_members m
    where m.workspace_id = owner_workspace and m.user_id = new.user_id
  ) then
    raise exception 'Only workspace members can join a conversation'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger conversation_members_sync_scope
  before insert or update on public.conversation_members
  for each row execute function public.conversation_members_sync_scope();

-- ============================================================
-- 20260905000600_messages.sql
-- ============================================================
-- Tyriaq — messages
--
-- A message carries its references as ids: who it mentions, which tasks
-- and projects it points at. The body keeps the display text so a
-- sentence still reads if something is deleted, but everything the
-- product acts on is an id, resolved live — the same rule documents
-- follow.

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,

  body text not null,

  -- Threading is one level deep on purpose: a reply points at a message,
  -- and a reply to a reply points at the same parent. Arbitrary nesting
  -- turns a conversation into a tree nobody can read in a narrow column.
  reply_to_id uuid references public.messages (id) on delete set null,

  mentions uuid[] not null default '{}',
  task_refs uuid[] not null default '{}',
  project_refs uuid[] not null default '{}',

  edited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint messages_body_length check (char_length(body) between 1 and 8000)
);

alter table public.messages enable row level security;

create index messages_conversation_idx on public.messages (conversation_id, created_at desc);
create index messages_workspace_idx on public.messages (workspace_id);
create index messages_author_idx on public.messages (author_id);
create index messages_mentions_idx on public.messages using gin (mentions);
create index messages_task_refs_idx on public.messages using gin (task_refs);

/*
  Full-text search over the body.

  A generated column rather than an expression index, so the same
  normalisation is used when writing and when querying — an index on
  `to_tsvector(body)` is easy to query with slightly different arguments
  and silently fall back to a sequential scan across the workspace.
*/
alter table public.messages
  add column search tsvector generated always as (to_tsvector('simple', body)) stored;
create index messages_search_idx on public.messages using gin (search);

create trigger messages_set_updated_at
  before update on public.messages
  for each row execute function public.set_updated_at();

/*
  Stamps the workspace, and drops every reference the author could not
  have made honestly: a mention of somebody outside the workspace, a task
  or project in another one, or a reply to a message in a different
  conversation.

  Each of those would otherwise be a way to make a message assert
  something false — a stranger's name on a thread, or a link to work the
  readers cannot see.
*/
create or replace function public.messages_sync_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_workspace uuid;
begin
  select c.workspace_id into owner_workspace
  from public.conversations c where c.id = new.conversation_id;

  if owner_workspace is null then
    raise exception 'Conversation does not exist' using errcode = 'P0001';
  end if;

  new.workspace_id := owner_workspace;

  new.mentions := coalesce((
    select array_agg(distinct m.user_id)
    from public.workspace_members m
    where m.workspace_id = owner_workspace and m.user_id = any (new.mentions)
  ), '{}'::uuid[]);

  new.task_refs := coalesce((
    select array_agg(distinct t.id)
    from public.tasks t
    where t.workspace_id = owner_workspace and t.id = any (new.task_refs)
  ), '{}'::uuid[]);

  new.project_refs := coalesce((
    select array_agg(distinct p.id)
    from public.projects p
    where p.workspace_id = owner_workspace and p.id = any (new.project_refs)
  ), '{}'::uuid[]);

  if new.reply_to_id is not null then
    if not exists (
      select 1 from public.messages m
      where m.id = new.reply_to_id and m.conversation_id = new.conversation_id
    ) then
      raise exception 'A reply must point at a message in the same conversation'
        using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

create trigger messages_sync_scope
  before insert or update on public.messages
  for each row execute function public.messages_sync_scope();

-- Keeps the conversation's sort key current. Cheaper by far than
-- deriving "most recent activity" from messages on every list render.
create or replace function public.messages_touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations
  set last_message_at = new.created_at
  where id = new.conversation_id
    and (last_message_at is null or last_message_at < new.created_at);
  return null;
end;
$$;

create trigger messages_touch_conversation
  after insert on public.messages
  for each row execute function public.messages_touch_conversation();

create policy "participants read messages"
  on public.messages for select
  to authenticated
  using (public.can_read_conversation(conversation_id));

/*
  Posting requires MEMBERSHIP, not just visibility.

  A project channel is readable by the whole workspace, but writing to
  one means joining it first — otherwise a message would arrive from
  somebody the conversation does not list, and the roster would stop
  describing who is talking.
*/
create policy "members post messages"
  on public.messages for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and public.is_conversation_member(conversation_id)
  );

-- Only the author edits their own words. Not even an admin: rewriting
-- somebody's message would leave a false record under their name.
create policy "authors edit their own messages"
  on public.messages for update
  to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

create policy "authors and admins delete messages"
  on public.messages for delete
  to authenticated
  using (author_id = auth.uid() or public.is_workspace_admin(workspace_id));

/* ------------------------------------------------------------------ */
/* Reactions                                                           */
/* ------------------------------------------------------------------ */

create table public.message_reactions (
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  emoji text not null,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  created_at timestamptz not null default now(),

  primary key (message_id, user_id, emoji),
  -- Short enough to be an emoji, long enough for the ones built from
  -- several code points (skin tones, flags, family sequences).
  constraint message_reactions_emoji_length check (char_length(emoji) between 1 and 24)
);

alter table public.message_reactions enable row level security;

create index message_reactions_workspace_idx on public.message_reactions (workspace_id);

create or replace function public.message_reactions_sync_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_workspace uuid;
begin
  select m.workspace_id into owner_workspace
  from public.messages m where m.id = new.message_id;

  if owner_workspace is null then
    raise exception 'Message does not exist' using errcode = 'P0001';
  end if;

  new.workspace_id := owner_workspace;
  return new;
end;
$$;

create trigger message_reactions_sync_scope
  before insert or update on public.message_reactions
  for each row execute function public.message_reactions_sync_scope();

create policy "participants read reactions"
  on public.message_reactions for select
  to authenticated
  using (
    exists (
      select 1 from public.messages m
      where m.id = message_id and public.can_read_conversation(m.conversation_id)
    )
  );

create policy "members react"
  on public.message_reactions for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.messages m
      where m.id = message_id and public.is_conversation_member(m.conversation_id)
    )
  );

-- Your own reaction only: removing somebody else's is editing what they
-- said about a message.
create policy "people remove their own reactions"
  on public.message_reactions for delete
  to authenticated
  using (user_id = auth.uid());

/* ------------------------------------------------------------------ */
/* Attachments                                                         */
/* ------------------------------------------------------------------ */

create table public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  uploaded_by uuid not null references public.profiles (id) on delete cascade,

  -- `<workspace_id>/<conversation_id>/<uuid>.<ext>`, so the storage
  -- policies read access from the leading segment as everywhere else.
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null default 'application/octet-stream',
  size_bytes bigint not null default 0,
  created_at timestamptz not null default now(),

  constraint message_attachments_name_length check (char_length(file_name) between 1 and 255),
  constraint message_attachments_size check (size_bytes >= 0 and size_bytes <= 26214400)
);

alter table public.message_attachments enable row level security;

create index message_attachments_message_idx on public.message_attachments (message_id);
create index message_attachments_workspace_idx on public.message_attachments (workspace_id);

create or replace function public.message_attachments_sync_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_workspace uuid;
  owner_conversation uuid;
begin
  select m.workspace_id, m.conversation_id into owner_workspace, owner_conversation
  from public.messages m where m.id = new.message_id;

  if owner_workspace is null then
    raise exception 'Message does not exist' using errcode = 'P0001';
  end if;

  new.workspace_id := owner_workspace;

  if split_part(new.storage_path, '/', 1) <> owner_workspace::text
     or split_part(new.storage_path, '/', 2) <> owner_conversation::text then
    raise exception 'An attachment must be stored under its own workspace and conversation'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger message_attachments_sync_scope
  before insert or update on public.message_attachments
  for each row execute function public.message_attachments_sync_scope();

create policy "participants read message attachments"
  on public.message_attachments for select
  to authenticated
  using (
    exists (
      select 1 from public.messages m
      where m.id = message_id and public.can_read_conversation(m.conversation_id)
    )
  );

create policy "members attach to their own messages"
  on public.message_attachments for insert
  to authenticated
  with check (
    uploaded_by = auth.uid()
    and exists (
      select 1 from public.messages m
      where m.id = message_id and m.author_id = auth.uid()
        and public.is_conversation_member(m.conversation_id)
    )
  );

create policy "uploaders and admins remove message attachments"
  on public.message_attachments for delete
  to authenticated
  using (uploaded_by = auth.uid() or public.is_workspace_admin(workspace_id));

-- ============================================================
-- 20260905000700_chat_rpc.sql
-- ============================================================
-- Tyriaq — chat RPCs
--
-- A conversation and its roster must exist together. Created separately,
-- there is a moment where the conversation has no members — and since
-- every policy reads membership, that conversation is invisible to
-- everyone including its author, permanently. Same trap as workspaces.

/*
  Opens the DM between the caller and one other person, creating it only
  if it does not exist.

  The pair is keyed by both ids in a fixed order, so "Alice opens Bob"
  and "Bob opens Alice" resolve to the same row. `on conflict` rather
  than "check then insert": two people opening each other at the same
  instant would both pass a check and create two conversations.
*/
create or replace function public.open_direct_message(other_user uuid)
returns public.conversations
language plpgsql
security definer
set search_path = ''
as $$
declare
  ws uuid;
  key text;
  result public.conversations;
begin
  if other_user = auth.uid() then
    raise exception 'You cannot open a conversation with yourself' using errcode = 'P0001';
  end if;

  -- The shared workspace is derived, never passed: it is the one place
  -- both people are members, which is also the permission check.
  select m.workspace_id into ws
  from public.workspace_members m
  join public.workspace_members other
    on other.workspace_id = m.workspace_id and other.user_id = other_user
  where m.user_id = auth.uid()
  limit 1;

  if ws is null then
    raise exception 'You are not in a workspace with that person' using errcode = 'P0001';
  end if;

  key := (select string_agg(id::text, ':' order by id::text)
          from (values (auth.uid()), (other_user)) as pair(id));

  insert into public.conversations (workspace_id, kind, dm_key, created_by)
  values (ws, 'dm', key, auth.uid())
  -- The index is partial (DMs only), so its predicate is repeated
  -- here or Postgres cannot match the conflict target to it.
  on conflict (workspace_id, dm_key) where dm_key is not null do nothing
  returning * into result;

  if result.id is null then
    select * into result from public.conversations
    where workspace_id = ws and dm_key = key;
  end if;

  insert into public.conversation_members (conversation_id, user_id, workspace_id)
  values (result.id, auth.uid(), ws), (result.id, other_user, ws)
  on conflict do nothing;

  return result;
end;
$$;

/*
  A named group with an explicit roster. The caller is always in it —
  creating a conversation you are not part of would make it unreadable
  to you the moment it existed.
*/
create or replace function public.create_group_conversation(
  conversation_title text,
  member_ids uuid[]
)
returns public.conversations
language plpgsql
security definer
set search_path = ''
as $$
declare
  ws uuid;
  result public.conversations;
  clean_title text := nullif(btrim(conversation_title), '');
begin
  if clean_title is null then
    raise exception 'Give the conversation a name' using errcode = 'P0001';
  end if;

  select m.workspace_id into ws
  from public.workspace_members m
  where m.user_id = auth.uid()
  order by m.created_at
  limit 1;

  if ws is null then
    raise exception 'You are not in a workspace' using errcode = 'P0001';
  end if;

  insert into public.conversations (workspace_id, kind, title, created_by)
  values (ws, 'group', left(clean_title, 120), auth.uid())
  returning * into result;

  -- Everyone named who is actually in the workspace, plus the author.
  -- Silently dropping outsiders rather than failing: the roster is a
  -- list of people to include, not an assertion to be validated.
  insert into public.conversation_members (conversation_id, user_id, workspace_id)
  select result.id, m.user_id, ws
  from public.workspace_members m
  where m.workspace_id = ws
    and (m.user_id = any (coalesce(member_ids, '{}'::uuid[])) or m.user_id = auth.uid())
  on conflict do nothing;

  return result;
end;
$$;

/*
  The channel for a project, created on first visit.

  The roster starts as the project's own members, but a project channel
  is READABLE by the whole workspace — joining is how somebody starts
  posting, and that is a single insert they are allowed to make
  themselves.
*/
create or replace function public.open_project_conversation(target_project uuid)
returns public.conversations
language plpgsql
security definer
set search_path = ''
as $$
declare
  ws uuid;
  result public.conversations;
begin
  select p.workspace_id into ws
  from public.projects p where p.id = target_project;

  if ws is null then
    raise exception 'Project does not exist' using errcode = 'P0001';
  end if;
  if not public.is_workspace_member(ws) then
    raise exception 'You are not in that workspace' using errcode = 'P0001';
  end if;

  insert into public.conversations (workspace_id, kind, project_id, created_by)
  values (ws, 'project', target_project, auth.uid())
  on conflict (project_id) where project_id is not null do nothing
  returning * into result;

  if result.id is null then
    select * into result from public.conversations where project_id = target_project;
  else
    insert into public.conversation_members (conversation_id, user_id, workspace_id)
    select result.id, pm.user_id, ws
    from public.project_members pm
    where pm.project_id = target_project
    on conflict do nothing;
  end if;

  return result;
end;
$$;

/*
  Turns a message into a task, and records the link on the message.

  The task is created through `create_task`, so it lands at the end of
  its column with the same defaults as one made on the board — a task
  born in chat is not a different kind of task. The reference is then
  appended to the message, which makes the chat line show the task's
  live title and status from then on, rather than a copy of the sentence
  that prompted it.
*/
create or replace function public.create_task_from_message(
  message_id uuid,
  target_project uuid,
  task_title text
)
returns public.tasks
language plpgsql
security invoker
set search_path = ''
as $$
declare
  source public.messages;
  created public.tasks;
  clean_title text := nullif(btrim(task_title), '');
begin
  -- security invoker: this read is subject to RLS, so a caller who
  -- cannot see the message cannot make a task from it.
  select * into source from public.messages where id = message_id;
  if source.id is null then
    raise exception 'Message not found' using errcode = 'P0001';
  end if;

  if clean_title is null then
    clean_title := left(regexp_replace(source.body, '\s+', ' ', 'g'), 200);
  end if;

  created := public.create_task(target_project, clean_title);

  update public.messages
  set task_refs = (
    select array_agg(distinct id) from unnest(task_refs || created.id) as id
  )
  where id = message_id;

  return created;
end;
$$;

grant execute on function public.open_direct_message(uuid) to authenticated;
grant execute on function public.create_group_conversation(text, uuid[]) to authenticated;
grant execute on function public.open_project_conversation(uuid) to authenticated;
grant execute on function public.create_task_from_message(uuid, uuid, text) to authenticated;

-- ============================================================
-- 20260905000800_chat_storage_realtime.sql
-- ============================================================
-- Tyriaq — chat files and live delivery

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-files', 'chat-files', false, 26214400, null)
on conflict (id) do nothing;

-- Paths are `<workspace_id>/<conversation_id>/<uuid>.<ext>`. Access is
-- decided from the leading segment, like every other bucket here.
create policy "members read chat files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'chat-files'
    and public.is_workspace_member(nullif(split_part(name, '/', 1), '')::uuid)
  );

create policy "members upload chat files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'chat-files'
    and public.is_workspace_member(nullif(split_part(name, '/', 1), '')::uuid)
  );

create policy "members delete their chat files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'chat-files'
    and public.is_workspace_member(nullif(split_part(name, '/', 1), '')::uuid)
  );

/*
  Live delivery.

  Messages, reactions and conversations are broadcast; RLS applies to
  subscribers, so a client is only sent rows it could already read —
  which for a DM means the two people in it.

  Presence ("who is here, who is typing") is NOT a table. It is ephemeral
  by nature, and writing it to Postgres would mean a row per keystroke
  and a cleanup problem for every session that ends by closing a laptop.
  Realtime's own presence channel holds it in memory instead.
*/
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and tablename = 'messages') then
      alter publication supabase_realtime add table public.messages;
    end if;
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and tablename = 'message_reactions') then
      alter publication supabase_realtime add table public.message_reactions;
    end if;
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and tablename = 'conversations') then
      alter publication supabase_realtime add table public.conversations;
    end if;
  end if;
end $$;

-- ============================================================
-- 20260905000900_time_entries.sql
-- ============================================================
-- Tyriaq — time tracking
--
-- The task panel has had a time section since the collaboration phase,
-- but nothing behind it: entries lived for the session and vanished on
-- reload. Reports ask for "time tracked" and "time by project" from real
-- data, which needs a real table.

create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  -- Denormalised so "time by project" is a group-by rather than a join
  -- through tasks on every report render.
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,

  minutes integer not null,
  note text not null default '',

  /*
    The day the work happened, which is not always the day it was
    entered — people log Friday's hours on Monday, and a report that
    filed them under Monday would misdate the week.
  */
  spent_on date not null default current_date,
  created_at timestamptz not null default now(),

  constraint time_entries_minutes check (minutes > 0 and minutes <= 1440),
  constraint time_entries_note_length check (char_length(note) <= 500)
);

alter table public.time_entries enable row level security;

create index time_entries_task_idx on public.time_entries (task_id);
create index time_entries_workspace_idx on public.time_entries (workspace_id, spent_on);
create index time_entries_project_idx on public.time_entries (project_id, spent_on);
create index time_entries_user_idx on public.time_entries (user_id, spent_on);

create or replace function public.time_entries_sync_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_workspace uuid;
  owner_project uuid;
begin
  select t.workspace_id, t.project_id into owner_workspace, owner_project
  from public.tasks t where t.id = new.task_id;

  if owner_workspace is null then
    raise exception 'Task does not exist' using errcode = 'P0001';
  end if;

  new.workspace_id := owner_workspace;
  new.project_id := owner_project;
  return new;
end;
$$;

create trigger time_entries_sync_scope
  before insert or update on public.time_entries
  for each row execute function public.time_entries_sync_scope();

-- Logged time appears in the task's history like everything else, so a
-- reader can see where the hours went without opening a report.
create or replace function public.time_entries_log_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.log_task_activity(
    new.task_id, new.workspace_id, 'logged',
    'logged ' ||
      case
        when new.minutes < 60 then new.minutes || 'm'
        when new.minutes % 60 = 0 then (new.minutes / 60) || 'h'
        else (new.minutes / 60) || 'h ' || (new.minutes % 60) || 'm'
      end,
    nullif(new.note, '')
  );
  return null;
end;
$$;

create trigger time_entries_log_activity
  after insert on public.time_entries
  for each row execute function public.time_entries_log_activity();

-- Everyone in the workspace can read the totals — that is what makes a
-- team report possible — but an entry is a claim about your own day, so
-- only its author may write, change or remove one.
create policy "members read time entries"
  on public.time_entries for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "people log their own time"
  on public.time_entries for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.tasks t
      where t.id = task_id and public.is_workspace_member(t.workspace_id)
    )
  );

create policy "people edit their own time"
  on public.time_entries for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "people delete their own time"
  on public.time_entries for delete
  to authenticated
  using (user_id = auth.uid() or public.is_workspace_admin(workspace_id));

-- ============================================================
-- 20260906000100_notifications.sql
-- ============================================================
-- Tyriaq — notifications
--
-- Written by TRIGGERS on the tables the events actually happen in, for
-- the same reason the activity feed is: a notification the application
-- has to remember to send is one that silently stops arriving the day
-- somebody adds a second way to assign a task.
--
-- Every row is addressed to ONE person. A notification is not a fact
-- about the workspace, it is a message to somebody — fanning out at
-- write time means "my unread count" is a filtered count on an indexed
-- column rather than a scan of everything that happened.

create type public.notification_kind as enum (
  'task_assigned',
  'task_mentioned',
  'comment_mention',
  'task_status',
  'task_completed',
  'due_soon',
  'task_overdue',
  'project_added',
  'workspace_added',
  'message_received'
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  -- Who it is for.
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- Who caused it. Null for the time-based ones, which nobody did.
  actor_id uuid references public.profiles (id) on delete set null,

  kind public.notification_kind not null,
  -- Reads after the actor's name where there is one: "Amina assigned you
  -- a task". Stored rather than composed on read so the wording is fixed
  -- at the moment it happened.
  title text not null,
  body text,

  /*
    What it points at.

    All nullable, all `on delete cascade`: a notification about a task
    that no longer exists would open a 404, and quietly disappearing is
    the better answer than a dead link in somebody's list.
  */
  task_id uuid references public.tasks (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  document_id uuid references public.documents (id) on delete cascade,
  conversation_id uuid references public.conversations (id) on delete cascade,
  message_id uuid references public.messages (id) on delete cascade,
  comment_id uuid references public.task_comments (id) on delete cascade,

  read_at timestamptz,
  created_at timestamptz not null default now(),

  /*
    The day it was created, in UTC, as a stored column.

    The daily-uniqueness index below needs a date, and casting a
    timestamptz to one depends on the session's timezone — which makes
    the expression non-immutable and unindexable. Fixing the zone makes
    it a constant function of the row, and "one reminder per day" is
    measured on the same clock for everybody rather than on whichever
    zone the connection happened to carry.
  */
  created_on date generated always as (((created_at at time zone 'UTC')::date)) stored
);

alter table public.notifications enable row level security;

-- The unread badge is the most frequent read in the product; this is the
-- index that makes it a lookup.
create index notifications_unread_idx on public.notifications (user_id, created_at desc)
  where read_at is null;
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_workspace_idx on public.notifications (workspace_id);

/*
  One notification per person per task per day for the date-based kinds.

  Without this, every visit to the notification centre would add another
  "this is due tomorrow" for the same task — the due-date sweep is
  idempotent because of this index, not because it checks first.
*/
create unique index notifications_due_once_daily
  on public.notifications (user_id, task_id, kind, created_on)
  where kind in ('due_soon', 'task_overdue');

/* ------------------------------------------------------------------ */
/* Preferences                                                         */
/* ------------------------------------------------------------------ */

create table public.notification_preferences (
  user_id uuid not null references public.profiles (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  /*
    What NOT to send.

    An opt-out list rather than an opt-in one: a person who has never
    opened the settings should receive everything, and a kind added in a
    later release should arrive by default rather than be silently off
    for everyone who already has a preferences row.
  */
  muted_kinds public.notification_kind[] not null default '{}',
  primary key (user_id, workspace_id)
);

alter table public.notification_preferences enable row level security;

create policy "people read their own preferences"
  on public.notification_preferences for select
  to authenticated
  using (user_id = auth.uid());

create policy "people set their own preferences"
  on public.notification_preferences for insert
  to authenticated
  with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));

create policy "people change their own preferences"
  on public.notification_preferences for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

/* ------------------------------------------------------------------ */
/* Policies                                                            */
/* ------------------------------------------------------------------ */

-- Yours and nobody else's. There is no policy that lets one person read
-- another's notifications, which is what stops the list leaking activity
-- from conversations the reader is not in.
create policy "people read their own notifications"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

-- Marking read is the only change a client makes. No insert policy at
-- all: notifications come from triggers, so nobody can post one to
-- somebody else claiming to be from them.
create policy "people mark their own notifications"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "people delete their own notifications"
  on public.notifications for delete
  to authenticated
  using (user_id = auth.uid());

/* ------------------------------------------------------------------ */
/* Delivery                                                            */
/* ------------------------------------------------------------------ */

/*
  The one place a notification is created.

  Refuses three things, so no trigger has to remember them:
    · notifying somebody about their own action
    · notifying somebody who has muted that kind
    · notifying somebody who is not in the workspace any more
*/
create or replace function public.notify_user(
  p_user uuid,
  p_workspace uuid,
  p_kind public.notification_kind,
  p_title text,
  p_body text default null,
  p_task uuid default null,
  p_project uuid default null,
  p_document uuid default null,
  p_conversation uuid default null,
  p_message uuid default null,
  p_comment uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user is null or p_user = auth.uid() then
    return;
  end if;

  if not exists (
    select 1 from public.workspace_members m
    where m.workspace_id = p_workspace and m.user_id = p_user
  ) then
    return;
  end if;

  if exists (
    select 1 from public.notification_preferences p
    where p.user_id = p_user and p.workspace_id = p_workspace
      and p_kind = any (p.muted_kinds)
  ) then
    return;
  end if;

  insert into public.notifications (
    user_id, workspace_id, actor_id, kind, title, body,
    task_id, project_id, document_id, conversation_id, message_id, comment_id
  )
  values (
    p_user, p_workspace, auth.uid(), p_kind, p_title, p_body,
    p_task, p_project, p_document, p_conversation, p_message, p_comment
  )
  -- The daily uniqueness of due-date reminders is enforced by index; a
  -- second one on the same day is not an error, it is a no-op.
  on conflict do nothing;
end;
$$;

/** The name to put in front of a sentence, for the trigger functions. */
create or replace function public.actor_name()
returns text
language sql
security definer
stable
set search_path = ''
as $$
  select coalesce(nullif(p.full_name, ''), 'Somebody')
  from public.profiles p where p.id = auth.uid();
$$;

-- ============================================================
-- 20260906000200_notification_triggers.sql
-- ============================================================
-- Tyriaq — where notifications come from
--
-- Each trigger answers one question: who needs to know about this?
-- `notify_user` handles the rest — self-notification, muting, and
-- membership — so none of these has to repeat it.

/* --------------------------- assignment --------------------------- */

create or replace function public.notify_task_assigned()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  task_title text;
begin
  select t.title into task_title from public.tasks t where t.id = new.task_id;

  perform public.notify_user(
    new.user_id, new.workspace_id, 'task_assigned',
    public.actor_name() || ' assigned you a task',
    task_title,
    new.task_id
  );
  return null;
end;
$$;

create trigger notify_task_assigned
  after insert on public.task_assignees
  for each row execute function public.notify_task_assigned();

/* ------------------------- status changes -------------------------- */

/*
  Told to: everyone assigned, plus whoever created it.

  Not the whole workspace. A status change matters to the people holding
  the work, and a notification everybody gets is one everybody learns to
  ignore.
*/
create or replace function public.notify_task_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient uuid;
  completed boolean := new.status = 'done' and old.status is distinct from 'done';
  label text;
begin
  if new.status is not distinct from old.status then
    return null;
  end if;

  label := case new.status
    when 'todo' then 'To do'
    when 'in_progress' then 'In progress'
    when 'review' then 'In review'
    when 'done' then 'Done'
    when 'blocked' then 'Blocked'
  end;

  for recipient in
    select a.user_id from public.task_assignees a where a.task_id = new.id
    union
    select new.created_by
  loop
    perform public.notify_user(
      recipient, new.workspace_id,
      -- Cast explicitly: a CASE over bare literals is `text`, which
      -- matches no overload of a function taking the enum.
      (case when completed then 'task_completed' else 'task_status' end)::public.notification_kind,
      public.actor_name() ||
        case when completed then ' completed a task' else ' moved a task to ' || label end,
      new.title,
      new.id
    );
  end loop;

  return null;
end;
$$;

create trigger notify_task_status
  after update of status on public.tasks
  for each row execute function public.notify_task_status();

/* --------------------------- mentions ------------------------------ */

create or replace function public.notify_comment_mention()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  mentioned uuid;
  task_title text;
begin
  select t.title into task_title from public.tasks t where t.id = new.task_id;

  foreach mentioned in array new.mentions loop
    perform public.notify_user(
      mentioned, new.workspace_id, 'comment_mention',
      public.actor_name() || ' mentioned you in a comment',
      -- Enough of the comment to know whether it needs answering now.
      left(new.body, 140),
      new.task_id, null, null, null, null, new.id
    );
  end loop;

  return null;
end;
$$;

create trigger notify_comment_mention
  after insert on public.task_comments
  for each row execute function public.notify_comment_mention();

/* --------------------------- messages ------------------------------ */

/*
  A mention in a message is a different event from the message itself:
  being named is worth interrupting somebody for, a busy channel is not.
  Whoever is mentioned gets the mention and NOT the duplicate.
*/
create or replace function public.notify_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient uuid;
  mentioned uuid;
  conversation_title text;
  referenced uuid;
begin
  select coalesce(c.title, p.name, 'a conversation') into conversation_title
  from public.conversations c
  left join public.projects p on p.id = c.project_id
  where c.id = new.conversation_id;

  foreach mentioned in array new.mentions loop
    perform public.notify_user(
      mentioned, new.workspace_id, 'comment_mention',
      public.actor_name() || ' mentioned you in ' || conversation_title,
      left(new.body, 140),
      null, null, null, new.conversation_id, new.id
    );
  end loop;

  for recipient in
    select m.user_id from public.conversation_members m
    where m.conversation_id = new.conversation_id
      and not m.muted
      and not (m.user_id = any (new.mentions))
  loop
    perform public.notify_user(
      recipient, new.workspace_id, 'message_received',
      public.actor_name() || ' sent a message in ' || conversation_title,
      left(new.body, 140),
      null, null, null, new.conversation_id, new.id
    );
  end loop;

  /*
    A message that references a task tells the people holding that task,
    even if they are not in the conversation — but only if they could
    read it anyway, which `notify_user` checks by workspace. This is the
    "task mentioned" case: your work was discussed somewhere.
  */
  foreach referenced in array new.task_refs loop
    for recipient in
      select a.user_id from public.task_assignees a where a.task_id = referenced
    loop
      perform public.notify_user(
        recipient, new.workspace_id, 'task_mentioned',
        public.actor_name() || ' mentioned a task you are on',
        left(new.body, 140),
        referenced, null, null, new.conversation_id, new.id
      );
    end loop;
  end loop;

  return null;
end;
$$;

create trigger notify_message
  after insert on public.messages
  for each row execute function public.notify_message();

/* ----------------------- documents referencing --------------------- */

create or replace function public.notify_document_task_mention()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient uuid;
  doc_title text;
begin
  select d.title into doc_title from public.documents d where d.id = new.document_id;

  for recipient in
    select a.user_id from public.task_assignees a where a.task_id = new.task_id
  loop
    perform public.notify_user(
      recipient, new.workspace_id, 'task_mentioned',
      public.actor_name() || ' linked a task you are on in a document',
      doc_title,
      new.task_id, null, new.document_id
    );
  end loop;

  return null;
end;
$$;

create trigger notify_document_task_mention
  after insert on public.document_task_links
  for each row execute function public.notify_document_task_mention();

/* ---------------------------- membership --------------------------- */

create or replace function public.notify_project_added()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  project_name text;
  ws uuid;
begin
  select p.name, p.workspace_id into project_name, ws
  from public.projects p where p.id = new.project_id;

  perform public.notify_user(
    new.user_id, ws, 'project_added',
    public.actor_name() || ' added you to a project',
    project_name,
    null, new.project_id
  );
  return null;
end;
$$;

create trigger notify_project_added
  after insert on public.project_members
  for each row execute function public.notify_project_added();

create or replace function public.notify_workspace_added()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  workspace_name text;
begin
  select w.name into workspace_name from public.workspaces w where w.id = new.workspace_id;

  perform public.notify_user(
    new.user_id, new.workspace_id, 'workspace_added',
    public.actor_name() || ' added you to a workspace',
    workspace_name
  );
  return null;
end;
$$;

create trigger notify_workspace_added
  after insert on public.workspace_members
  for each row execute function public.notify_workspace_added();

/* --------------------------- due dates ----------------------------- */

/*
  Dates do not fire triggers — nothing happens in the database when a
  deadline passes, because nothing is written.
  
  So this is a sweep, and it is IDEMPOTENT: the unique index on
  (user, task, kind, day) means running it a hundred times a day
  produces one reminder per task per day. That is what makes it safe to
  call from the application on a read, which is how it runs without
  pg_cron; schedule it instead if the extension is available:
  
    select cron.schedule('tyriaq-due', '0 7 * * *',
                         $$select public.sweep_due_notifications()$$);
*/
create or replace function public.sweep_due_notifications()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  row record;
  sent integer := 0;
begin
  for row in
    select t.id, t.title, t.workspace_id, t.due_date, a.user_id,
           (t.due_date < current_date) as is_overdue
    from public.tasks t
    join public.task_assignees a on a.task_id = t.id
    where t.status <> 'done'
      and t.due_date is not null
      -- Today, tomorrow, or already past. Further out is not news.
      and t.due_date <= current_date + 1
  loop
    insert into public.notifications (
      user_id, workspace_id, kind, title, body, task_id
    )
    select
      row.user_id, row.workspace_id,
      (case when row.is_overdue then 'task_overdue' else 'due_soon' end)::public.notification_kind,
      case when row.is_overdue then 'A task is overdue' else 'A task is due soon' end,
      row.title,
      row.id
    where not exists (
      select 1 from public.notification_preferences p
      where p.user_id = row.user_id and p.workspace_id = row.workspace_id
        and (case when row.is_overdue then 'task_overdue' else 'due_soon' end)::public.notification_kind
            = any (p.muted_kinds)
    )
    on conflict do nothing;

    sent := sent + 1;
  end loop;

  return sent;
end;
$$;

grant execute on function public.sweep_due_notifications() to authenticated;

/* ---------------------------- realtime ----------------------------- */

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and tablename = 'notifications') then
      alter publication supabase_realtime add table public.notifications;
    end if;
  end if;
end $$;

-- ============================================================
-- 20260906000300_fix_cascade_logging.sql
-- ============================================================
-- Tyriaq — let a task be deleted again
--
-- Deleting a task cascades to its assignees and attachments, and each of
-- those has an AFTER DELETE trigger that writes an activity entry. The
-- entry references the task — which, by then, is already gone. Postgres
-- refuses the foreign key and the whole delete aborts.
--
-- The effect: any task with an assignee or an attachment could not be
-- deleted at all. The board's Delete action simply failed.
--
-- The fix is to recognise the difference between the two ways these
-- rows disappear. Somebody unassigning a colleague is an event worth
-- recording. A row vanishing because its task was deleted is not — there
-- is no longer anything for the entry to be attached to, and the history
-- goes with the task by design.

create or replace function public.task_assignees_log_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_name text;
  target_id uuid;
  workspace uuid;
  task uuid;
begin
  if tg_op = 'INSERT' then
    target_id := new.user_id; workspace := new.workspace_id; task := new.task_id;
  else
    target_id := old.user_id; workspace := old.workspace_id; task := old.task_id;
  end if;

  -- The task is on its way out; there is nothing left to log against.
  if not exists (select 1 from public.tasks t where t.id = task) then
    return null;
  end if;

  select coalesce(nullif(p.full_name, ''), 'someone') into target_name
  from public.profiles p where p.id = target_id;

  perform public.log_task_activity(
    task, workspace, 'assigned',
    case
      when tg_op = 'INSERT' and target_id = auth.uid() then 'took this on'
      when tg_op = 'INSERT' then 'assigned ' || coalesce(target_name, 'someone')
      when target_id = auth.uid() then 'stepped off this task'
      else 'unassigned ' || coalesce(target_name, 'someone')
    end
  );

  return null;
end;
$$;

create or replace function public.task_attachments_log_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_task_activity(
      new.task_id, new.workspace_id, 'attached', 'attached a file', new.file_name
    );
    return null;
  end if;

  if not exists (select 1 from public.tasks t where t.id = old.task_id) then
    return null;
  end if;

  perform public.log_task_activity(
    old.task_id, old.workspace_id, 'attached', 'removed a file', old.file_name
  );
  return null;
end;
$$;

-- ============================================================
-- 20260907000100_invitations.sql
-- ============================================================
-- Tyriaq — invitations
--
-- Until now a workspace could only ever contain the person who created
-- it: `workspace_members` had no path in for anybody else. This is that
-- path.
--
-- An invitation is a row, not an email. The email (or the link, or the
-- message) is just how the token travels — which means invitations work
-- before any mail provider is configured, and keep working if one is
-- swapped out later.

create table public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,

  /*
    Lower-cased on write.

    Mail addresses are case-insensitive in the part that matters, and an
    invitation to `Ahmed@x.com` that refuses `ahmed@x.com` would be a
    dead end nobody could diagnose from the outside.
  */
  email text not null,
  role public.workspace_role not null default 'member',

  /*
    The secret in the link.

    Long and random: this token IS the authorisation to join, so it has
    to be unguessable. `gen_random_bytes` is from pgcrypto, which
    Supabase enables by default.
  */
  token text not null unique default encode(gen_random_bytes(24), 'hex'),

  invited_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- An invitation that never expires is a permanent key to the
  -- workspace sitting in somebody's inbox.
  expires_at timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz,
  accepted_by uuid references public.profiles (id) on delete set null,

  constraint workspace_invitations_email_shape check (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
);

alter table public.workspace_invitations enable row level security;

create index workspace_invitations_workspace_idx on public.workspace_invitations (workspace_id);
create index workspace_invitations_email_idx on public.workspace_invitations (email);

-- One live invitation per address per workspace. Re-inviting somebody
-- should not litter the list with five rows that all still work.
create unique index workspace_invitations_pending_unique
  on public.workspace_invitations (workspace_id, email)
  where accepted_at is null;

create or replace function public.invitations_normalise_email()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.email := lower(btrim(new.email));
  return new;
end;
$$;

create trigger invitations_normalise_email
  before insert or update of email on public.workspace_invitations
  for each row execute function public.invitations_normalise_email();

/*
  Admins manage invitations; nobody else sees them.

  The invitee cannot read this table at all — they arrive holding a
  token, and `invitation_preview()` below answers for exactly that row
  without exposing the rest.
*/
create policy "admins read invitations"
  on public.workspace_invitations for select
  to authenticated
  using (public.is_workspace_admin(workspace_id));

create policy "admins create invitations"
  on public.workspace_invitations for insert
  to authenticated
  with check (invited_by = auth.uid() and public.is_workspace_admin(workspace_id));

create policy "admins revoke invitations"
  on public.workspace_invitations for delete
  to authenticated
  using (public.is_workspace_admin(workspace_id));

/* ------------------------------------------------------------------ */
/* Accepting                                                           */
/* ------------------------------------------------------------------ */

/**
 * What the link says before you act on it.
 *
 * Runs as definer because the reader is, by definition, not yet a member
 * of anything. It returns only what a joining page needs — which
 * workspace, who invited you, whether it is still good — and never the
 * token, the other invitations, or anything about the workspace itself.
 */
create or replace function public.invitation_preview(invite_token text)
returns table (
  workspace_name text,
  invited_email text,
  invited_role public.workspace_role,
  inviter_name text,
  is_expired boolean,
  is_accepted boolean
)
language sql
security definer
stable
set search_path = ''
as $$
  select
    w.name,
    i.email,
    i.role,
    coalesce(nullif(p.full_name, ''), 'Somebody'),
    i.expires_at < now(),
    i.accepted_at is not null
  from public.workspace_invitations i
  join public.workspaces w on w.id = i.workspace_id
  left join public.profiles p on p.id = i.invited_by
  where i.token = invite_token;
$$;

/**
 * Joins the caller to the workspace the token names.
 *
 * The address on the invitation must match the account accepting it.
 * Without that check the link alone would be enough to join — and links
 * get forwarded, pasted into group chats and indexed by whatever sits in
 * front of somebody's inbox.
 *
 * Idempotent: accepting twice, or accepting when already a member,
 * succeeds quietly rather than erroring on the unique constraint. People
 * double-click, and links get opened twice.
 */
create or replace function public.accept_invitation(invite_token text)
returns public.workspaces
language plpgsql
security definer
set search_path = ''
as $$
declare
  invite public.workspace_invitations;
  caller_email text;
  result public.workspaces;
begin
  select * into invite from public.workspace_invitations where token = invite_token;
  if invite.id is null then
    raise exception 'That invitation link is not valid' using errcode = 'P0001';
  end if;
  if invite.expires_at < now() then
    raise exception 'That invitation has expired — ask for a new one' using errcode = 'P0001';
  end if;

  select lower(u.email) into caller_email from auth.users u where u.id = auth.uid();
  if caller_email is null then
    raise exception 'Sign in to accept an invitation' using errcode = 'P0001';
  end if;
  if caller_email <> invite.email then
    raise exception 'This invitation was sent to % — sign in with that address', invite.email
      using errcode = 'P0001';
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (invite.workspace_id, auth.uid(), invite.role)
  on conflict (workspace_id, user_id) do nothing;

  update public.workspace_invitations
  set accepted_at = coalesce(accepted_at, now()),
      accepted_by = coalesce(accepted_by, auth.uid())
  where id = invite.id;

  select * into result from public.workspaces where id = invite.workspace_id;
  return result;
end;
$$;

grant execute on function public.invitation_preview(text) to authenticated, anon;
grant execute on function public.accept_invitation(text) to authenticated;

-- ============================================================
-- 20260907000200_space_members.sql
-- ============================================================
-- Tyriaq — space membership, with permission levels
--
-- The level a person holds in a space, which every project inside it
-- inherits unless the project says otherwise. This is the first half of
-- the model the People & Permissions screen was designed against; the
-- project-level override follows it.

create type public.permission_level as enum ('viewer', 'commenter', 'editor', 'admin');

create table public.space_members (
  space_id uuid not null references public.spaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  level public.permission_level not null default 'editor',
  added_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (space_id, user_id)
);

alter table public.space_members enable row level security;

create index space_members_user_idx on public.space_members (user_id);
create index space_members_workspace_idx on public.space_members (workspace_id);

/*
  The workspace comes from the space, and the person must already be in
  that workspace — the same guard every other membership table uses, for
  the same reason: without it a client could name any user id at all.
*/
create or replace function public.space_members_sync_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_workspace uuid;
begin
  select s.workspace_id into owner_workspace
  from public.spaces s where s.id = new.space_id;

  if owner_workspace is null then
    raise exception 'Space does not exist' using errcode = 'P0001';
  end if;

  new.workspace_id := owner_workspace;

  if not exists (
    select 1 from public.workspace_members m
    where m.workspace_id = owner_workspace and m.user_id = new.user_id
  ) then
    raise exception 'Invite them to the workspace first' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger space_members_sync_scope
  before insert or update on public.space_members
  for each row execute function public.space_members_sync_scope();

/**
 * Whether the caller may change who is in a space.
 *
 * Workspace owners and admins always can — there has to be somebody who
 * can repair a space nobody else can reach — and so can anybody holding
 * `admin` on the space itself.
 */
create or replace function public.can_manage_space(target uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.spaces s
    where s.id = target
      and (
        public.is_workspace_admin(s.workspace_id)
        or exists (
          select 1 from public.space_members m
          where m.space_id = s.id and m.user_id = auth.uid() and m.level = 'admin'
        )
      )
  );
$$;

grant execute on function public.can_manage_space(uuid) to authenticated;

-- Everyone in the workspace can see who is in a space. Membership is not
-- a secret; what it grants is enforced separately.
create policy "members read space members"
  on public.space_members for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "space admins add members"
  on public.space_members for insert
  to authenticated
  with check (public.can_manage_space(space_id));

create policy "space admins change levels"
  on public.space_members for update
  to authenticated
  using (public.can_manage_space(space_id))
  with check (public.can_manage_space(space_id));

-- You can always remove yourself; removing anybody else needs admin.
create policy "space admins remove members, and people leave"
  on public.space_members for delete
  to authenticated
  using (user_id = auth.uid() or public.can_manage_space(space_id));
