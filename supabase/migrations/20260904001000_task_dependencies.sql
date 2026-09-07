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
