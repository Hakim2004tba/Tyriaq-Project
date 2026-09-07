-- Tyriaq — collaboration: comments, activity history and file attachments.
--
-- Run this in the Supabase SQL editor AFTER the task system
-- (apply-tasks.sql, or an apply-all.sql from before this phase). It adds
-- only what collaboration needs and changes nothing that already exists.
--
-- Safe to run once; re-running errors on the objects it already created,
-- which is the intended guard against applying it twice.

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
