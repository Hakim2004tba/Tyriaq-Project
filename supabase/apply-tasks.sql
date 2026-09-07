-- Tyriaq — the task system.
--
-- Run this in the Supabase SQL editor AFTER apply-all.sql (which created
-- profiles, workspaces, spaces and projects). It adds only what the task
-- system needs and touches nothing that already exists.
--
-- Safe to run once; re-running errors on the objects it already created,
-- which is the intended guard against applying it twice.

-- ============================================================
-- 20260904000800_tasks.sql
-- ============================================================
-- Tyriaq — tasks
--
-- Workspace → Space → Project → Task. As with projects, `workspace_id` is
-- denormalised onto the row so every policy answers the one question the
-- model turns on — is the caller a member of this workspace — without a
-- join running per row on every read. A trigger re-derives it from the
-- project, so the copy cannot drift or be forged by a client.

create type public.task_status as enum ('todo', 'in_progress', 'review', 'done', 'blocked');
create type public.task_priority as enum ('low', 'medium', 'high', 'urgent');

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,

  -- Subtasks are tasks with a parent. One table, so a subtask carries the
  -- same fields as anything else and "the same task across every view"
  -- stays literally true rather than a second shape to keep in step.
  parent_task_id uuid references public.tasks (id) on delete cascade,

  title text not null,
  description text not null default '',
  status public.task_status not null default 'todo',
  priority public.task_priority not null default 'medium',
  start_date date,
  due_date date,
  tags text[] not null default '{}',
  is_milestone boolean not null default false,

  /*
    Manual ordering.

    Fractional rather than integer: dropping a task between two others
    writes the midpoint of their positions and touches exactly one row.
    Integer positions would mean renumbering everything below the drop on
    every single move.
  */
  position double precision not null default 0,

  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint tasks_title_length check (char_length(title) between 1 and 200),
  constraint tasks_dates_ordered check (start_date is null or due_date is null or start_date <= due_date),
  constraint tasks_not_own_parent check (parent_task_id is null or parent_task_id <> id)
);

alter table public.tasks enable row level security;

create index tasks_project_idx on public.tasks (project_id);
create index tasks_workspace_idx on public.tasks (workspace_id);
create index tasks_parent_idx on public.tasks (parent_task_id);
create index tasks_position_idx on public.tasks (project_id, position);

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

/*
  Derives `workspace_id` from the project, and keeps subtasks in the same
  project as their parent.

  Both checks close the same hole: a client that could name any project or
  any parent would otherwise be able to attach a row to a workspace it can
  read, while pointing it at one it cannot.
*/
create or replace function public.tasks_sync_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_workspace uuid;
  parent_project uuid;
begin
  select p.workspace_id into owner_workspace
  from public.projects p where p.id = new.project_id;

  if owner_workspace is null then
    raise exception 'Project does not exist' using errcode = 'P0001';
  end if;

  new.workspace_id := owner_workspace;

  if new.parent_task_id is not null then
    select t.project_id into parent_project
    from public.tasks t where t.id = new.parent_task_id;

    if parent_project is null then
      raise exception 'Parent task does not exist' using errcode = 'P0001';
    end if;
    if parent_project <> new.project_id then
      raise exception 'A subtask must live in the same project as its parent'
        using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

create trigger tasks_sync_scope
  before insert or update of project_id, parent_task_id on public.tasks
  for each row execute function public.tasks_sync_scope();

create policy "members read tasks in their workspaces"
  on public.tasks for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "members create tasks"
  on public.tasks for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.projects p
      where p.id = project_id and public.is_workspace_member(p.workspace_id)
    )
  );

create policy "members update tasks in their workspaces"
  on public.tasks for update
  to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- Any member may delete a task. Unlike a space or a project, a task is a
-- small, routine unit of work — requiring an admin to remove one would
-- make the board unusable.
create policy "members delete tasks in their workspaces"
  on public.tasks for delete
  to authenticated
  using (public.is_workspace_member(workspace_id));

-- ============================================================
-- 20260904000900_task_assignees.sql
-- ============================================================
-- Tyriaq — task assignees
--
-- A join table rather than a `tasks.assignee_id` column: a task can carry
-- several people, and the board needs to filter by assignee without
-- unpacking an array.

create table public.task_assignees (
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (task_id, user_id)
);

alter table public.task_assignees enable row level security;

create index task_assignees_user_idx on public.task_assignees (user_id);
create index task_assignees_workspace_idx on public.task_assignees (workspace_id);

/*
  Copies the workspace down from the task, and refuses to assign someone
  who is not in that workspace.

  Without the membership check a member could name any user id at all and
  put a stranger's name on their board — the assignee list is visible to
  everyone who can read the task.
*/
create or replace function public.task_assignees_sync_scope()
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

  if not exists (
    select 1 from public.workspace_members m
    where m.workspace_id = owner_workspace and m.user_id = new.user_id
  ) then
    raise exception 'Only workspace members can be assigned to a task'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger task_assignees_sync_scope
  before insert or update on public.task_assignees
  for each row execute function public.task_assignees_sync_scope();

create policy "members read task assignees"
  on public.task_assignees for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "members assign tasks"
  on public.task_assignees for insert
  to authenticated
  with check (
    exists (
      select 1 from public.tasks t
      where t.id = task_id and public.is_workspace_member(t.workspace_id)
    )
  );

create policy "members unassign tasks"
  on public.task_assignees for delete
  to authenticated
  using (public.is_workspace_member(workspace_id));

-- ============================================================
-- 20260904001000_task_dependencies.sql
-- ============================================================
-- Tyriaq — task dependencies
--
-- One row per edge: `predecessor` must finish before `successor` starts.
-- This is what the Gantt view draws its arrows from.

create table public.task_dependencies (
  predecessor_id uuid not null references public.tasks (id) on delete cascade,
  successor_id uuid not null references public.tasks (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (predecessor_id, successor_id),
  constraint task_dependencies_no_self_edge check (predecessor_id <> successor_id)
);

alter table public.task_dependencies enable row level security;

create index task_dependencies_successor_idx on public.task_dependencies (successor_id);
create index task_dependencies_workspace_idx on public.task_dependencies (workspace_id);

/*
  Both ends must be in the same project, and the graph must stay acyclic.

  The cycle check walks the existing edges from the successor: if the
  predecessor is already reachable downstream of it, adding this edge would
  close a loop and the Gantt renderer would never settle.
*/
create or replace function public.task_dependencies_validate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  predecessor_project uuid;
  successor_project uuid;
  predecessor_workspace uuid;
begin
  select t.project_id, t.workspace_id into predecessor_project, predecessor_workspace
  from public.tasks t where t.id = new.predecessor_id;

  select t.project_id into successor_project
  from public.tasks t where t.id = new.successor_id;

  if predecessor_project is null or successor_project is null then
    raise exception 'Both tasks must exist' using errcode = 'P0001';
  end if;

  if predecessor_project <> successor_project then
    raise exception 'Dependencies can only link tasks in the same project'
      using errcode = 'P0001';
  end if;

  new.workspace_id := predecessor_workspace;

  if exists (
    with recursive downstream as (
      select d.successor_id as id
      from public.task_dependencies d
      where d.predecessor_id = new.successor_id
      union
      select d.successor_id
      from public.task_dependencies d
      join downstream w on d.predecessor_id = w.id
    )
    select 1 from downstream where id = new.predecessor_id
  ) then
    raise exception 'That dependency would create a cycle' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger task_dependencies_validate
  before insert or update on public.task_dependencies
  for each row execute function public.task_dependencies_validate();

create policy "members read task dependencies"
  on public.task_dependencies for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "members create task dependencies"
  on public.task_dependencies for insert
  to authenticated
  with check (
    exists (
      select 1 from public.tasks t
      where t.id = predecessor_id and public.is_workspace_member(t.workspace_id)
    )
  );

create policy "members delete task dependencies"
  on public.task_dependencies for delete
  to authenticated
  using (public.is_workspace_member(workspace_id));

-- ============================================================
-- 20260904001100_task_rpc.sql
-- ============================================================
-- Tyriaq — task RPCs
--
-- Drag and drop and progress both need more than a single-row update, so
-- they live here rather than being assembled client-side out of several
-- round trips that could half-apply.

/*
  Places a task between two neighbours, optionally moving it to another
  status column at the same time — which is what a Kanban drop is.

  The caller passes the ids it dropped between rather than a number,
  because only the server knows the current positions; a client computing
  the midpoint from a stale list would collide with a concurrent move.

  Positions are only ever midpoints, so a move rewrites exactly one row.
  Doubles run out of precision after roughly fifty successive drops into
  the same gap, so the function renormalises that column to whole numbers
  when the gap it is handed gets too small to halve meaningfully.
*/
create or replace function public.move_task(
  p_task uuid,
  p_status public.task_status default null,
  p_previous uuid default null,
  p_next uuid default null
)
returns public.tasks
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target public.tasks;
  previous_position double precision;
  next_position double precision;
  new_position double precision;
  target_status public.task_status;
begin
  -- security invoker: this select is subject to RLS, so a caller who
  -- cannot read the task cannot move it either.
  select * into target from public.tasks where id = p_task;
  if target.id is null then
    raise exception 'Task not found' using errcode = 'P0001';
  end if;

  target_status := coalesce(p_status, target.status);

  select position into previous_position from public.tasks
  where id = p_previous and project_id = target.project_id;

  select position into next_position from public.tasks
  where id = p_next and project_id = target.project_id;

  if previous_position is null and next_position is null then
    -- Dropped into an empty column: start a fresh scale.
    new_position := 0;
  elsif previous_position is null then
    new_position := next_position - 1;
  elsif next_position is null then
    new_position := previous_position + 1;
  else
    new_position := (previous_position + next_position) / 2;
  end if;

  update public.tasks
  set position = new_position, status = target_status
  where id = p_task
  returning * into target;

  if previous_position is not null and next_position is not null
     and abs(next_position - previous_position) < 0.000001 then
    perform public.renormalise_task_positions(target.project_id, target_status);
    select * into target from public.tasks where id = p_task;
  end if;

  return target;
end;
$$;

-- Rewrites one column's positions as 0, 1, 2, … preserving current order.
create or replace function public.renormalise_task_positions(
  p_project uuid,
  p_status public.task_status
)
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.tasks t
  set position = ordered.rank
  from (
    select id, (row_number() over (order by position, created_at)) - 1 as rank
    from public.tasks
    where project_id = p_project and status = p_status
  ) ordered
  where t.id = ordered.id and t.position is distinct from ordered.rank;
$$;

/*
  Creates a task at the end of its column in one round trip, so the client
  never has to read the current maximum position and race another writer.
*/
create or replace function public.create_task(
  p_project uuid,
  p_title text,
  p_status public.task_status default 'todo',
  p_priority public.task_priority default 'medium',
  p_parent uuid default null,
  p_start_date date default null,
  p_due_date date default null
)
returns public.tasks
language plpgsql
security invoker
set search_path = ''
as $$
declare
  created public.tasks;
begin
  insert into public.tasks (project_id, workspace_id, title, status, priority,
                            parent_task_id, start_date, due_date, position, created_by)
  values (
    p_project,
    -- Overwritten by tasks_sync_scope; a value is needed for the not-null
    -- column before the trigger replaces it with the authoritative one.
    '00000000-0000-0000-0000-000000000000',
    p_title, p_status, p_priority, p_parent, p_start_date, p_due_date,
    coalesce(
      (select max(position) + 1 from public.tasks
       where project_id = p_project and status = p_status),
      0
    ),
    auth.uid()
  )
  returning * into created;

  return created;
end;
$$;

grant execute on function public.move_task(uuid, public.task_status, uuid, uuid) to authenticated;
grant execute on function public.renormalise_task_positions(uuid, public.task_status) to authenticated;
grant execute on function public.create_task(uuid, text, public.task_status, public.task_priority, uuid, date, date) to authenticated;
