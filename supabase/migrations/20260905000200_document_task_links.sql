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
