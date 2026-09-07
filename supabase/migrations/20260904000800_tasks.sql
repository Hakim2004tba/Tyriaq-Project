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
