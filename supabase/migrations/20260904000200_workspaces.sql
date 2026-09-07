-- Tyriaq — workspaces
--
-- The tenant boundary. Every space, and later every project and task,
-- hangs off a workspace, and every authorization question in the product
-- ultimately reduces to "is this user a member of this workspace".
--
-- Policies are NOT defined here. They depend on `workspace_members`,
-- which does not exist yet; they are added in the next migration once
-- both tables and the membership helpers are in place.

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspaces_name_length check (char_length(name) between 1 and 80),
  constraint workspaces_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint workspaces_slug_length check (char_length(slug) between 2 and 48)
);

alter table public.workspaces enable row level security;

create index workspaces_created_by_idx on public.workspaces (created_by);

create trigger workspaces_set_updated_at
  before update on public.workspaces
  for each row execute function public.set_updated_at();
