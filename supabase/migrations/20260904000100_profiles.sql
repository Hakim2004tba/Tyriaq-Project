-- Tyriaq — profiles
--
-- `auth.users` is owned by Supabase and must not be queried directly from
-- application code: it holds credentials and is not safe to expose through
-- RLS. `profiles` is the public mirror — one row per user, created by a
-- trigger so a profile can never be missing for a signed-up account.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_full_name_length check (char_length(full_name) <= 120)
);

alter table public.profiles enable row level security;

-- Any signed-in user may read any profile: names and avatars appear on
-- shared workspace surfaces (members lists, assignees), and scoping reads
-- to shared workspaces would need a recursive policy for no real benefit.
create policy "profiles are readable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "users update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- No INSERT or DELETE policy on purpose: rows are created by the trigger
-- below and removed by the cascade from auth.users. Nothing else should
-- be able to invent or destroy a profile.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

/*
  Creates the profile row for every new account.

  SECURITY DEFINER because it writes to a table the new user has no INSERT
  policy for, and `set search_path = ''` so a malicious schema on the
  caller's search_path cannot shadow the objects this function resolves.
*/
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

/*
  Backfill for accounts that already exist.

  The trigger above only fires on INSERT, so anyone who signed up before
  this migration ran would have no profile — and the app would render them
  as a nameless user with no way to fix it, since `profiles` has no INSERT
  policy. `on conflict do nothing` keeps this safe to re-run.
*/
insert into public.profiles (id, full_name, avatar_url)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'full_name', ''),
  u.raw_user_meta_data ->> 'avatar_url'
from auth.users u
on conflict (id) do nothing;
