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
