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
