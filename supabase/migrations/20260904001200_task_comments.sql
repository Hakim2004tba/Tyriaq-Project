-- Tyriaq — task comments
--
-- Comments hang off a task and inherit its workspace, the same way
-- every other task-scoped table does: one denormalised `workspace_id`
-- kept honest by a trigger, so each policy is a single membership
-- question rather than a join executed per row.

create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  /* References `profiles`, not `auth.users`.

     Both are the same identity — a profile row exists for every account
     and is removed with it — but only this one lets the API return a
     comment together with its author in a single query. A foreign key to
     `auth.users` would force a second round trip per screen just to turn
     ids into names. */
  author_id uuid not null references public.profiles (id) on delete cascade,

  body text not null,

  /*
    Who this comment addresses.

    Stored as ids rather than parsed out of the body on read: the body
    holds display names, and a person can be renamed. Ids keep an old
    mention pointing at the same human, and let "mentions of me" be an
    index lookup instead of a text scan.
  */
  mentions uuid[] not null default '{}',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Distinct from `updated_at`, which any future system write would also
  -- touch. This one means a person edited what they said, and is what
  -- the "edited" marker in the panel reads.
  edited_at timestamptz,

  constraint task_comments_body_length check (char_length(body) between 1 and 10000)
);

alter table public.task_comments enable row level security;

create index task_comments_task_idx on public.task_comments (task_id, created_at);
create index task_comments_workspace_idx on public.task_comments (workspace_id);
create index task_comments_mentions_idx on public.task_comments using gin (mentions);

create trigger task_comments_set_updated_at
  before update on public.task_comments
  for each row execute function public.set_updated_at();

/*
  Stamps the workspace from the task, and drops any mention of somebody
  who is not in that workspace — a mention is a claim that a colleague is
  involved, and it should not be possible to attach a stranger's id to a
  task by hand-writing the array.
*/
create or replace function public.task_comments_sync_scope()
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

  new.mentions := coalesce(
    (
      select array_agg(distinct m.user_id)
      from public.workspace_members m
      where m.workspace_id = owner_workspace
        and m.user_id = any (new.mentions)
    ),
    '{}'::uuid[]
  );

  return new;
end;
$$;

create trigger task_comments_sync_scope
  before insert or update of task_id, mentions on public.task_comments
  for each row execute function public.task_comments_sync_scope();

-- Everyone in the workspace reads the discussion; only its author may
-- change or remove what they said. A comment is a record of what a
-- person actually wrote, so nobody else gets to rewrite it — not even a
-- workspace admin.
create policy "members read task comments"
  on public.task_comments for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "members write task comments"
  on public.task_comments for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.tasks t
      where t.id = task_id and public.is_workspace_member(t.workspace_id)
    )
  );

create policy "authors edit their own comments"
  on public.task_comments for update
  to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

/*
  Deletion is the author's, or a workspace admin's.

  Editing stays with the author alone — an admin rewriting someone's
  words would leave a false record under their name — but removing
  something abusive is exactly the job moderation exists for.
*/
create policy "authors and admins delete comments"
  on public.task_comments for delete
  to authenticated
  using (author_id = auth.uid() or public.is_workspace_admin(workspace_id));
