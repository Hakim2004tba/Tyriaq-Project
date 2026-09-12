-- Tyriaq — starred tasks
--
-- The star in the task panel was decoration until now. It is a personal
-- bookmark, not a property of the task: two people looking at the same
-- task see their own star, and one starring it must not change anything
-- the other sees.
--
-- Hence a row per (task, person) rather than a boolean on `tasks` —
-- which could only ever have recorded one person's opinion.

create table public.task_stars (
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (task_id, user_id)
);

alter table public.task_stars enable row level security;

-- "My starred tasks", which is the query this table exists to answer.
create index task_stars_user_idx on public.task_stars (user_id, created_at desc);

create or replace function public.task_stars_sync_scope()
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
  return new;
end;
$$;

create trigger task_stars_sync_scope
  before insert or update on public.task_stars
  for each row execute function public.task_stars_sync_scope();

/*
  Yours alone — read included.

  Unlike assignees or comments, there is no reason for anybody else to
  see what you have bookmarked, so the select policy is narrowed to the
  owner rather than to the workspace.
*/
create policy "people read their own stars"
  on public.task_stars for select
  to authenticated
  using (user_id = auth.uid());

create policy "people star tasks they can see"
  on public.task_stars for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.tasks t
      where t.id = task_id and public.is_workspace_member(t.workspace_id)
    )
  );

create policy "people unstar their own"
  on public.task_stars for delete
  to authenticated
  using (user_id = auth.uid());
