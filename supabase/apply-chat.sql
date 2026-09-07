-- Tyriaq — chat.
--
-- Run this in the Supabase SQL editor AFTER the earlier files. It adds
-- conversations, messages, reactions, attachments and their live
-- delivery, and changes nothing that already exists.
--
-- Safe to run once; re-running errors on the objects it already created,
-- which is the intended guard against applying it twice.

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
