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
