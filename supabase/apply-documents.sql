-- Tyriaq — documents.
--
-- Run this in the Supabase SQL editor AFTER the earlier files. It adds
-- the documents system and changes nothing that already exists.
--
-- Safe to run once; re-running errors on the objects it already created,
-- which is the intended guard against applying it twice.

-- ============================================================
-- 20260905000100_documents.sql
-- ============================================================
-- Tyriaq — documents
--
-- A document belongs to a workspace, optionally sits in a folder, and
-- optionally belongs to a project. All three are nullable-or-not in the
-- way the product reads: workspace always, folder and project only when
-- somebody has filed it.
--
-- Content is stored as JSONB rather than HTML or Markdown. The editor's
-- document model is a tree, and keeping it as one means a task
-- reference is a NODE with an id — not a string that has to be parsed
-- back out — which is what lets the database see which documents point
-- at which tasks.

create table public.document_folders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  -- Folders nest. `on delete cascade` would silently take a whole
  -- subtree with the parent, so children are lifted to the root instead
  -- and stay findable.
  parent_id uuid references public.document_folders (id) on delete set null,
  name text not null,
  position double precision not null default 0,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint document_folders_name_length check (char_length(name) between 1 and 120),
  constraint document_folders_not_own_parent check (parent_id is null or parent_id <> id)
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  folder_id uuid references public.document_folders (id) on delete set null,
  -- Deleting a project takes its documents with it: a project doc is
  -- about that project, and orphaning it leaves a page nobody can place.
  project_id uuid references public.projects (id) on delete cascade,

  title text not null default 'Untitled',
  /* TipTap/ProseMirror JSON. `{"type":"doc","content":[]}` is an empty
     document — distinct from SQL NULL, which would mean "never saved". */
  content jsonb not null default '{"type":"doc","content":[]}'::jsonb,

  archived_at timestamptz,
  created_by uuid not null references public.profiles (id) on delete cascade,
  -- Who touched it last, for "edited by X" without reading a history.
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint documents_title_length check (char_length(title) between 1 and 200),
  constraint documents_content_is_doc check (content ->> 'type' = 'doc')
);

alter table public.document_folders enable row level security;
alter table public.documents enable row level security;

create index document_folders_workspace_idx on public.document_folders (workspace_id);
create index document_folders_parent_idx on public.document_folders (parent_id);
create index documents_workspace_idx on public.documents (workspace_id, updated_at desc);
create index documents_folder_idx on public.documents (folder_id);
create index documents_project_idx on public.documents (project_id);

create trigger document_folders_set_updated_at
  before update on public.document_folders
  for each row execute function public.set_updated_at();

create trigger documents_set_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

/*
  Keeps a document's workspace honest.

  When it belongs to a project, the workspace is the project's — derived,
  not trusted, exactly as tasks do it. A folder must belong to the same
  workspace, or a document could be filed into a folder its readers
  cannot see.
*/
create or replace function public.documents_sync_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  project_workspace uuid;
  folder_workspace uuid;
begin
  if new.project_id is not null then
    select p.workspace_id into project_workspace
    from public.projects p where p.id = new.project_id;

    if project_workspace is null then
      raise exception 'Project does not exist' using errcode = 'P0001';
    end if;
    new.workspace_id := project_workspace;
  end if;

  if new.folder_id is not null then
    select f.workspace_id into folder_workspace
    from public.document_folders f where f.id = new.folder_id;

    if folder_workspace is null then
      raise exception 'Folder does not exist' using errcode = 'P0001';
    end if;
    if folder_workspace <> new.workspace_id then
      raise exception 'A document and its folder must be in the same workspace'
        using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

create trigger documents_sync_scope
  before insert or update of project_id, folder_id, workspace_id on public.documents
  for each row execute function public.documents_sync_scope();

/*
  Folder nesting must stay a tree.

  Without this, dragging a folder into its own descendant would close a
  loop, and the sidebar — which walks parents to build the tree — would
  recurse until the browser gave up.
*/
create or replace function public.document_folders_validate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  ancestor uuid := new.parent_id;
  guard int := 0;
  parent_workspace uuid;
begin
  if new.parent_id is not null then
    select f.workspace_id into parent_workspace
    from public.document_folders f where f.id = new.parent_id;

    if parent_workspace is null then
      raise exception 'Parent folder does not exist' using errcode = 'P0001';
    end if;
    if parent_workspace <> new.workspace_id then
      raise exception 'A folder and its parent must be in the same workspace'
        using errcode = 'P0001';
    end if;
  end if;

  while ancestor is not null loop
    if ancestor = new.id then
      raise exception 'A folder cannot be moved inside itself' using errcode = 'P0001';
    end if;
    guard := guard + 1;
    if guard > 64 then
      raise exception 'Folder nesting is too deep' using errcode = 'P0001';
    end if;
    select f.parent_id into ancestor from public.document_folders f where f.id = ancestor;
  end loop;

  return new;
end;
$$;

create trigger document_folders_validate
  before insert or update of parent_id, workspace_id on public.document_folders
  for each row execute function public.document_folders_validate();

/* ------------------------------------------------------------------ */
/* Policies                                                            */
/* ------------------------------------------------------------------ */

create policy "members read document folders"
  on public.document_folders for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "members create document folders"
  on public.document_folders for insert
  to authenticated
  with check (created_by = auth.uid() and public.is_workspace_member(workspace_id));

create policy "members update document folders"
  on public.document_folders for update
  to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- Deleting a folder does not delete its documents — they fall back to
-- the root — so this stays open to any member, like renaming it.
create policy "members delete document folders"
  on public.document_folders for delete
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "members read documents"
  on public.documents for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "members create documents"
  on public.documents for insert
  to authenticated
  with check (created_by = auth.uid() and public.is_workspace_member(workspace_id));

-- Anyone in the workspace may edit any document. That is what a
-- collaborative wiki means; per-document permissions would need a
-- sharing model this product does not have yet, and pretending to
-- enforce one here would be worse than not having it.
create policy "members update documents"
  on public.documents for update
  to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

/*
  Permanent deletion is the author's or an admin's; archiving is an
  UPDATE and stays open to everyone. The reversible path is the one
  everybody has.
*/
create policy "authors and admins delete documents"
  on public.documents for delete
  to authenticated
  using (created_by = auth.uid() or public.is_workspace_admin(workspace_id));

-- ============================================================
-- 20260905000200_document_task_links.sql
-- ============================================================
-- Tyriaq — task references inside documents
--
-- A document does not copy a task. It holds a node carrying the task's
-- id, and the task's title, status and assignees are read from `tasks`
-- when the document is rendered — so renaming a task updates every
-- document mentioning it, and closing one shows as closed everywhere.
--
-- This table is the reverse index of those nodes, maintained by a
-- trigger. It exists so "which documents reference this task" is a
-- lookup rather than a scan of every document body in the workspace,
-- and so a task can eventually show its own list of mentions.

create table public.document_task_links (
  document_id uuid not null references public.documents (id) on delete cascade,
  task_id uuid not null references public.tasks (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  primary key (document_id, task_id)
);

alter table public.document_task_links enable row level security;

create index document_task_links_task_idx on public.document_task_links (task_id);
create index document_task_links_workspace_idx on public.document_task_links (workspace_id);

/*
  Every task id appearing as a `taskLink` node, anywhere in the tree.

  A jsonb path query rather than a recursive walk in PL/pgSQL: the
  document is a tree of unknown depth, and `jsonb_path_query` descends it
  in one pass inside the server.
*/
create or replace function public.document_task_ids(body jsonb)
returns setof uuid
language sql
immutable
set search_path = ''
as $$
  select distinct (value #>> '{}')::uuid
  from jsonb_path_query(
    body,
    '$.**.attrs.id ? (@ != null)'
  ) as value
  where value #>> '{}' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and exists (
      select 1
      from jsonb_path_query(body, '$.**') as node
      where node -> 'attrs' ->> 'id' = value #>> '{}'
        and node ->> 'type' = 'taskLink'
    );
$$;

/*
  Rewrites the index whenever a document's body changes.

  Deleting and reinserting rather than diffing: a document has a handful
  of references, the write happens once per save, and a diff would be
  more code to get subtly wrong for no measurable gain.

  Rows are only written for tasks that exist in the SAME workspace. A
  document cannot manufacture a link to a task its readers cannot see,
  even if somebody pastes a foreign id into the body by hand.
*/
create or replace function public.documents_sync_task_links()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.document_task_links where document_id = new.id;

  insert into public.document_task_links (document_id, task_id, workspace_id)
  select new.id, t.id, new.workspace_id
  from public.document_task_ids(new.content) as referenced(id)
  join public.tasks t on t.id = referenced.id and t.workspace_id = new.workspace_id;

  return null;
end;
$$;

create trigger documents_sync_task_links
  after insert or update of content, workspace_id on public.documents
  for each row execute function public.documents_sync_task_links();

-- Read-only to clients: the index is derived from document bodies, and
-- letting anyone write it directly would let a row claim a reference the
-- document does not contain.
create policy "members read document task links"
  on public.document_task_links for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

-- ============================================================
-- 20260905000300_document_images.sql
-- ============================================================
-- Tyriaq — images inside documents
--
-- A separate bucket from task attachments: the lifecycles differ (an
-- image belongs to a body of text, not to a piece of work) and one
-- prefix per concern keeps the storage policies readable.
--
-- Private, like `task-files`. Documents render images through short-lived
-- signed URLs resolved when the page loads, so an image pasted into a
-- private document does not become a permanent public link the moment
-- somebody copies its address.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('document-images', 'document-images', false, 10485760,
        array['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'])
on conflict (id) do nothing;

-- Paths are `<workspace_id>/<document_id>/<uuid>.<ext>`, so access is the
-- same single membership question the rest of the schema asks.
create policy "members read document images"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'document-images'
    and public.is_workspace_member(nullif(split_part(name, '/', 1), '')::uuid)
  );

create policy "members upload document images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'document-images'
    and public.is_workspace_member(nullif(split_part(name, '/', 1), '')::uuid)
  );

-- Any member may remove one. Unlike an attachment, an image is part of a
-- document everybody may already edit — being able to delete the picture
-- but not the paragraph around it would be a strange half-permission.
create policy "members delete document images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'document-images'
    and public.is_workspace_member(nullif(split_part(name, '/', 1), '')::uuid)
  );

-- ============================================================
-- 20260905000400_document_realtime.sql
-- ============================================================
-- Tyriaq — documents on the realtime channel
--
-- Only so an open editor can be TOLD that somebody else saved. The
-- payload is not applied to the page: without a merge strategy, applying
-- a remote body would throw away whatever the reader has typed since.
--
-- This is the honest half of collaborative editing that the current
-- architecture can support — detecting a conflict — as distinct from
-- resolving one, which needs a CRDT and a server that can merge.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'documents'
    ) then
      alter publication supabase_realtime add table public.documents;
    end if;
  end if;
end $$;
