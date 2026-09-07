-- Tyriaq — time tracking, for reports.
--
-- Run this in the Supabase SQL editor AFTER the earlier files. It adds
-- the `time_entries` table that "time tracked" and "time by project"
-- read from, and changes nothing that already exists.

-- ============================================================
-- 20260905000900_time_entries.sql
-- ============================================================
-- Tyriaq — time tracking
--
-- The task panel has had a time section since the collaboration phase,
-- but nothing behind it: entries lived for the session and vanished on
-- reload. Reports ask for "time tracked" and "time by project" from real
-- data, which needs a real table.

create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  -- Denormalised so "time by project" is a group-by rather than a join
  -- through tasks on every report render.
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,

  minutes integer not null,
  note text not null default '',

  /*
    The day the work happened, which is not always the day it was
    entered — people log Friday's hours on Monday, and a report that
    filed them under Monday would misdate the week.
  */
  spent_on date not null default current_date,
  created_at timestamptz not null default now(),

  constraint time_entries_minutes check (minutes > 0 and minutes <= 1440),
  constraint time_entries_note_length check (char_length(note) <= 500)
);

alter table public.time_entries enable row level security;

create index time_entries_task_idx on public.time_entries (task_id);
create index time_entries_workspace_idx on public.time_entries (workspace_id, spent_on);
create index time_entries_project_idx on public.time_entries (project_id, spent_on);
create index time_entries_user_idx on public.time_entries (user_id, spent_on);

create or replace function public.time_entries_sync_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_workspace uuid;
  owner_project uuid;
begin
  select t.workspace_id, t.project_id into owner_workspace, owner_project
  from public.tasks t where t.id = new.task_id;

  if owner_workspace is null then
    raise exception 'Task does not exist' using errcode = 'P0001';
  end if;

  new.workspace_id := owner_workspace;
  new.project_id := owner_project;
  return new;
end;
$$;

create trigger time_entries_sync_scope
  before insert or update on public.time_entries
  for each row execute function public.time_entries_sync_scope();

-- Logged time appears in the task's history like everything else, so a
-- reader can see where the hours went without opening a report.
create or replace function public.time_entries_log_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.log_task_activity(
    new.task_id, new.workspace_id, 'logged',
    'logged ' ||
      case
        when new.minutes < 60 then new.minutes || 'm'
        when new.minutes % 60 = 0 then (new.minutes / 60) || 'h'
        else (new.minutes / 60) || 'h ' || (new.minutes % 60) || 'm'
      end,
    nullif(new.note, '')
  );
  return null;
end;
$$;

create trigger time_entries_log_activity
  after insert on public.time_entries
  for each row execute function public.time_entries_log_activity();

-- Everyone in the workspace can read the totals — that is what makes a
-- team report possible — but an entry is a claim about your own day, so
-- only its author may write, change or remove one.
create policy "members read time entries"
  on public.time_entries for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "people log their own time"
  on public.time_entries for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.tasks t
      where t.id = task_id and public.is_workspace_member(t.workspace_id)
    )
  );

create policy "people edit their own time"
  on public.time_entries for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "people delete their own time"
  on public.time_entries for delete
  to authenticated
  using (user_id = auth.uid() or public.is_workspace_admin(workspace_id));
