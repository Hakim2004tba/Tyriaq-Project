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
