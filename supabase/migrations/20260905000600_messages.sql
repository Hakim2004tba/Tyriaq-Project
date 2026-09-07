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
