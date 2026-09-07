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
