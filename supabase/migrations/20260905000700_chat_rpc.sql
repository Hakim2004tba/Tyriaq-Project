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
