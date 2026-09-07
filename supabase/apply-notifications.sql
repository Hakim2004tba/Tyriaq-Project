-- Tyriaq — notifications.
--
-- Run this in the Supabase SQL editor AFTER the earlier files.
--
-- It also carries a FIX for a bug in the collaboration phase: deleting a
-- task that had an assignee or an attachment failed outright, because
-- the cascade fired an activity trigger that tried to log against the
-- task after it was gone. That is repaired here whether or not you use
-- notifications.

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
