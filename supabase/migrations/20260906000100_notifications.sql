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
