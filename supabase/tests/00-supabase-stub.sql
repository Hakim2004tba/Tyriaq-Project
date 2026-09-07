-- Minimal stand-in for the parts of Supabase this schema depends on,
-- so the migrations can be executed and the RLS model exercised locally.
create schema if not exists auth;

create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  raw_user_meta_data jsonb not null default '{}'::jsonb
);

-- Supabase reads the caller's id out of the verified JWT. Locally we set
-- the same GUC by hand to impersonate a user.
create or replace function auth.uid()
returns uuid
language plpgsql
stable
as $$
declare claims text := current_setting('request.jwt.claims', true);
begin
  if claims is null or claims = '' then return null; end if;
  return nullif(claims::json ->> 'sub', '')::uuid;
end;
$$;

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
end $$;

grant usage on schema public to authenticated, anon;
alter default privileges in schema public grant all on tables to authenticated;

-- Supabase grants these to `authenticated` by default; the stub has to
-- do it explicitly or every policy calling auth.uid() fails with
-- "permission denied for schema auth".
grant usage on schema auth to authenticated, anon;
grant execute on function auth.uid() to authenticated, anon;
grant select on auth.users to authenticated;

/*
  Storage.

  Enough of Supabase's storage schema for the bucket and its policies to
  be applied and executed: a `buckets` table and an `objects` table with
  the two columns the policies read (`bucket_id`, `name`, `owner`).
  Uploads in the real system go through the storage API, but the rules
  that API consults are ordinary row policies, and these are the ones
  under test.
*/
create schema if not exists storage;

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null references storage.buckets (id),
  name text not null,
  owner uuid,
  created_at timestamptz not null default now()
);

alter table storage.objects enable row level security;

grant usage on schema storage to authenticated, anon;
grant select, insert, delete on storage.objects to authenticated;
grant select on storage.buckets to authenticated;

/*
  Realtime.

  The migration adds its tables to `supabase_realtime` only if that
  publication exists, so creating an empty one here is what makes that
  branch actually run rather than silently skip during tests.
*/
do $$ begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;
