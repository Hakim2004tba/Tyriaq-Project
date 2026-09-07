-- Tyriaq — spaces
--
-- Workspace → Space → (Folder) → Project → Task. This migration lands the
-- space layer only; folders and projects arrive with their own phase.
--
-- Authorization is inherited, never duplicated: a space is visible exactly
-- when its workspace is. Copying the membership test into space policies
-- would mean two places to keep in step and two places to get wrong.

create type public.space_color as enum ('violet', 'blue', 'emerald', 'amber', 'rose', 'cyan');

create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  slug text not null,
  description text not null default '',
  icon text not null default 'layers',
  color public.space_color not null default 'violet',
  position int not null default 0,
  archived_at timestamptz,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint spaces_name_length check (char_length(name) between 1 and 80),
  constraint spaces_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  -- Slugs address a space inside its workspace, so they only have to be
  -- unique there — two workspaces may each have a "design" space.
  constraint spaces_slug_unique_per_workspace unique (workspace_id, slug)
);

alter table public.spaces enable row level security;

create index spaces_workspace_idx on public.spaces (workspace_id);

create trigger spaces_set_updated_at
  before update on public.spaces
  for each row execute function public.set_updated_at();

create policy "members read spaces in their workspaces"
  on public.spaces for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

-- Any member may create a space; `created_by` is pinned to the caller so
-- a client cannot attribute a space to someone else.
create policy "members create spaces"
  on public.spaces for insert
  to authenticated
  with check (public.is_workspace_member(workspace_id) and created_by = auth.uid());

create policy "members update spaces in their workspaces"
  on public.spaces for update
  to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- Deletion is destructive and will later cascade to projects and tasks,
-- so it is admin-only. Archiving (setting archived_at) stays open to any
-- member through the update policy above.
create policy "admins delete spaces"
  on public.spaces for delete
  to authenticated
  using (public.is_workspace_admin(workspace_id));
