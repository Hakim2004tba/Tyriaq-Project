-- Tyriaq — automations.
--
-- Run this in the Supabase SQL editor: select all, press Run.
-- Safe to run more than once.
--
-- "When a task moves to Done, assign it to the reviewer." Rules live
-- here as data; the RUNNER lives in the application, because a trigger
-- executing user-defined actions would be a small interpreter inside
-- Postgres with no way to see what it did.
--
-- Two things this file guarantees that the app cannot:
--   · only a space or workspace admin may write a rule, though anybody
--     who can see the project can read what rules exist;
--   · the run log has no insert policy at all, so a client cannot claim
--     a rule did something it never did.

create table if not exists public.automations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,

  name text not null,
  enabled boolean not null default true,

  /*
    What starts it. One of a closed set rather than free text: the
    runner has to recognise it, and a trigger nothing listens for is a
    rule that silently never fires.
  */
  trigger text not null,

  /*
    Narrowing, as a json object the runner reads:
      {"status_id": "...", "category": "done", "priority": "urgent"}
    Empty means "whenever the trigger fires".
  */
  conditions jsonb not null default '{}'::jsonb,

  /*
    What to do, in order:
      [{"type":"assign","user_id":"..."},
       {"type":"set_priority","priority":"high"},
       {"type":"set_status","status_id":"..."},
       {"type":"add_tag","tag":"review"},
       {"type":"comment","body":"Ready for review"}]
  */
  actions jsonb not null default '[]'::jsonb,

  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint automations_name_length check (char_length(name) between 1 and 120),
  constraint automations_trigger_known check (
    trigger in (
      'task_created',
      'status_changed',
      'assigned',
      'due_soon',
      'priority_changed'
    )
  ),
  constraint automations_actions_is_array check (jsonb_typeof(actions) = 'array'),
  constraint automations_conditions_is_object check (jsonb_typeof(conditions) = 'object')
);

alter table public.automations enable row level security;

create index if not exists automations_project_idx
  on public.automations (project_id)
  where enabled;

/*
  What happened, every time one ran.

  Without this an automation is a ghost: somebody's task changed, nobody
  touched it, and there is nothing to point at. The log is what makes a
  rule debuggable by the person who wrote it rather than by us.
*/
create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid not null references public.automations (id) on delete cascade,
  task_id uuid references public.tasks (id) on delete set null,
  /** 0 for a human's change; 1 for a rule reacting to one. */
  depth integer not null default 0,
  status text not null default 'ok',
  detail text,
  created_at timestamptz not null default now(),

  constraint runs_status_known check (status in ('ok', 'skipped', 'failed'))
);

alter table public.automation_runs enable row level security;

create index if not exists automation_runs_recent_idx
  on public.automation_runs (automation_id, created_at desc);

/* ------------------------------------------------------------------ */
/* Who may see and write rules                                         */
/* ------------------------------------------------------------------ */

drop policy if exists "people read automations they can see" on public.automations;
create policy "people read automations they can see"
  on public.automations for select
  to authenticated
  using (public.can_see_project(project_id));

/*
  Writing is narrower than reading, on purpose.

  An automation acts on everybody's tasks in a project, so the person
  writing one needs more standing than the person reading the board —
  the same bar as changing who is in the space it belongs to.
*/
drop policy if exists "managers write automations" on public.automations;
create policy "managers write automations"
  on public.automations for all
  to authenticated
  using (
    public.can_manage_space((select p.space_id from public.projects p where p.id = project_id))
  )
  with check (
    public.can_manage_space((select p.space_id from public.projects p where p.id = project_id))
    and workspace_id = (select p.workspace_id from public.projects p where p.id = project_id)
  );

drop policy if exists "people read automation runs" on public.automation_runs;
create policy "people read automation runs"
  on public.automation_runs for select
  to authenticated
  using (
    exists (
      select 1 from public.automations a
      where a.id = automation_id and public.can_see_project(a.project_id)
    )
  );

/*
  No insert policy for runs.

  The log is written by `record_automation_run`, which is the runner's
  own voice. A client that could write rows here could claim a rule did
  something it never did, which is the one thing a log must not allow.
*/
create or replace function public.record_automation_run(
  p_automation uuid,
  p_task uuid,
  p_depth integer,
  p_status text,
  p_detail text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.automation_runs (automation_id, task_id, depth, status, detail)
  values (p_automation, p_task, greatest(p_depth, 0), p_status, left(p_detail, 500));

  /*
    Kept short. A busy project would otherwise accumulate a row per task
    per rule forever, and nobody reads the hundredth-most-recent run of
    a rule that has worked a thousand times.
  */
  delete from public.automation_runs r
  where r.automation_id = p_automation
    and r.created_at < now() - interval '30 days';
end;
$$;

grant execute on function public.record_automation_run(uuid, uuid, integer, text, text) to authenticated;

notify pgrst, 'reload schema';
