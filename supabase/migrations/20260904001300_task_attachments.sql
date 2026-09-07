-- Tyriaq — task attachments
--
-- The FILE lives in Supabase Storage; this table is the metadata that
-- makes it a first-class thing in the product — who attached it, when,
-- to which task, and under what name. Storage alone cannot answer those
-- questions without turning object paths into a database.

create table public.task_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  -- `profiles`, not `auth.users`, so the API can return the uploader
  -- alongside the file. See the note in the comments migration.
  uploaded_by uuid not null references public.profiles (id) on delete cascade,

  /* Path inside the `task-files` bucket: `<workspace>/<task>/<uuid>.<ext>`.
     The leading segment is what the storage policies read to decide
     access, so it must stay the workspace that owns the row. */
  storage_path text not null unique,

  -- The name the person uploaded it under. Kept separate from the path,
  -- which is a uuid so two people uploading "final.pdf" cannot collide
  -- and no filename ever has to be sanitised into a URL.
  file_name text not null,
  mime_type text not null default 'application/octet-stream',
  size_bytes bigint not null default 0,

  created_at timestamptz not null default now(),

  constraint task_attachments_name_length check (char_length(file_name) between 1 and 255),
  constraint task_attachments_size check (size_bytes >= 0 and size_bytes <= 26214400)
);

alter table public.task_attachments enable row level security;

create index task_attachments_task_idx on public.task_attachments (task_id, created_at);
create index task_attachments_workspace_idx on public.task_attachments (workspace_id);

/*
  Stamps the workspace from the task and forces the storage path to
  begin with it.

  The storage policies grant access by reading that first path segment.
  If a row could claim a path under another workspace's prefix, this
  table would become a way to hand out reads the storage layer believes
  are legitimate.
*/
create or replace function public.task_attachments_sync_scope()
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

  if split_part(new.storage_path, '/', 1) <> owner_workspace::text
     or split_part(new.storage_path, '/', 2) <> new.task_id::text then
    raise exception 'An attachment must be stored under its own workspace and task'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger task_attachments_sync_scope
  before insert or update on public.task_attachments
  for each row execute function public.task_attachments_sync_scope();

create policy "members read task attachments"
  on public.task_attachments for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "members attach files"
  on public.task_attachments for insert
  to authenticated
  with check (
    uploaded_by = auth.uid()
    and exists (
      select 1 from public.tasks t
      where t.id = task_id and public.is_workspace_member(t.workspace_id)
    )
  );

-- Uploader or admin, matching comments: removing a file someone else
-- attached is moderation, not editing.
create policy "uploaders and admins remove attachments"
  on public.task_attachments for delete
  to authenticated
  using (uploaded_by = auth.uid() or public.is_workspace_admin(workspace_id));
