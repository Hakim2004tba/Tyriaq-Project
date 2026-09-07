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
