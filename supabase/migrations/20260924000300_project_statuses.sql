-- Tyriaq — statuses a project defines for itself
--
-- `todo / in_progress / review / done / blocked` is a reasonable default
-- and a poor fit for most real work. A print shop moves things through
-- "Designing → Printing → Delivered"; a clinic through "Booked → Seen →
-- Billed". Forcing both into five fixed words is the difference between
-- a tool a team adopts and one they fight.
--
-- The obvious change — replace the enum with a table — would touch every
-- query, every report, the progress bar, and the meaning of "done" in a
-- dozen places. So instead each custom status carries a CATEGORY, which
-- is one of the five the product already understands:
--
--   · a project names its own columns and orders them;
--   · every column maps to a category, so "Delivered" is still `done`
--     and everything that counts finished work keeps working;
--   · a project that defines nothing behaves exactly as it does today.
--
-- The cost is one honest constraint: a team cannot invent a category.
-- "Delivered" must be one of the five kinds of state the product knows
-- how to reason about — which is what makes a burndown chart possible at
-- all.

create table if not exists public.project_statuses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  /** What the product should understand this to MEAN. */
  category public.task_status not null,
  /** A semantic token name, never a hex — same rule as every badge. */
  color text not null default 'neutral',
  position integer not null default 0,
  created_at timestamptz not null default now(),

  constraint project_statuses_name_length check (char_length(name) between 1 and 40)
);

alter table public.project_statuses enable row level security;

create index if not exists project_statuses_project_idx
  on public.project_statuses (project_id, position);

create unique index if not exists project_statuses_unique_name
  on public.project_statuses (project_id, lower(name));

/*
  Which specific column a task sits in.

  Null means the project has no custom statuses and the task is in the
  category itself — every project that exists today, so nothing changes
  until somebody defines one.
*/
alter table public.tasks
  add column if not exists status_id uuid references public.project_statuses (id) on delete set null;

create index if not exists tasks_status_id_idx on public.tasks (status_id);

/*
  The two must agree.

  `status` stays the source of truth for everything that reasons about
  work — progress bars, reports, "is it finished" — so a task in
  "Delivered" must also be `done`. Rather than asking every write path to
  remember that, the trigger derives one from the other.
*/
create or replace function public.tasks_sync_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  mapped public.task_status;
  owner_project uuid;
begin
  if new.status_id is null then
    return new;
  end if;

  select s.category, s.project_id into mapped, owner_project
  from public.project_statuses s where s.id = new.status_id;

  if mapped is null then
    raise exception 'That status does not exist' using errcode = 'P0001';
  end if;
  -- A status belongs to one board; a task cannot borrow another's.
  if owner_project <> new.project_id then
    raise exception 'That status belongs to another project' using errcode = 'P0001';
  end if;

  new.status := mapped;
  return new;
end;
$$;

drop trigger if exists tasks_sync_status on public.tasks;
create trigger tasks_sync_status
  before insert or update of status_id on public.tasks
  for each row execute function public.tasks_sync_status();

/*
  Changing a column's category re-files every task in it.

  Without this, renaming "Delivered" from `done` to `in_progress` would
  leave a board whose finished column reports as unfinished — the two
  copies of the answer drifting apart, which is exactly what the trigger
  above exists to prevent.
*/
create or replace function public.project_statuses_recategorise()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.category is distinct from old.category then
    update public.tasks set status = new.category where status_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists project_statuses_recategorise on public.project_statuses;
create trigger project_statuses_recategorise
  after update on public.project_statuses
  for each row execute function public.project_statuses_recategorise();

/* ------------------------------------------------------------------ */
/* Policies                                                            */
/* ------------------------------------------------------------------ */

drop policy if exists "people read statuses of projects they see" on public.project_statuses;
create policy "people read statuses of projects they see"
  on public.project_statuses for select
  to authenticated
  using (public.can_see_project(project_id));

/*
  Defining the columns of a board is the same kind of decision as
  defining its fields: it changes what everybody sees, so it belongs to
  whoever manages the space.
*/
drop policy if exists "managers write statuses" on public.project_statuses;
create policy "managers write statuses"
  on public.project_statuses for all
  to authenticated
  using (public.can_manage_space((select p.space_id from public.projects p where p.id = project_id)))
  with check (public.can_manage_space((select p.space_id from public.projects p where p.id = project_id)));

/* ------------------------------------------------------------------ */
/* Turning it on for a project                                         */
/* ------------------------------------------------------------------ */

/*
  Seeds a project with the five defaults, then lets it diverge.
 
  Starting from the familiar set rather than an empty board: a team that
  opens this screen wants to RENAME "In progress" to "Printing", not to
  design a workflow from nothing. Existing tasks are filed into the
  matching column so nothing appears to move.
*/
create or replace function public.seed_project_statuses(p_project uuid)
returns setof public.project_statuses
language plpgsql
security definer
set search_path = ''
as $$
declare
  ws uuid;
  space uuid;
begin
  select p.workspace_id, p.space_id into ws, space
  from public.projects p where p.id = p_project;

  if ws is null then
    raise exception 'Project does not exist' using errcode = 'P0001';
  end if;
  if not public.can_manage_space(space) then
    raise exception 'Only a space or workspace admin can change a board' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.project_statuses s where s.project_id = p_project) then
    return query select * from public.project_statuses s
      where s.project_id = p_project order by s.position;
    return;
  end if;

  insert into public.project_statuses (project_id, workspace_id, name, category, color, position)
  values
    (p_project, ws, 'To do',       'todo',        'neutral', 0),
    (p_project, ws, 'In progress', 'in_progress', 'info',    1),
    (p_project, ws, 'In review',   'review',      'warning', 2),
    (p_project, ws, 'Blocked',     'blocked',     'danger',  3),
    (p_project, ws, 'Done',        'done',        'success', 4);

  -- Existing work lands in the column matching where it already was.
  update public.tasks t
  set status_id = s.id
  from public.project_statuses s
  where t.project_id = p_project
    and s.project_id = p_project
    and s.category = t.status
    and t.status_id is null;

  return query select * from public.project_statuses s
    where s.project_id = p_project order by s.position;
end;
$$;

grant execute on function public.seed_project_statuses(uuid) to authenticated;
