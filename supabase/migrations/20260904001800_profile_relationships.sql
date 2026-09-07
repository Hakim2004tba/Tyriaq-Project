-- Tyriaq — make every person column readable through the API
--
-- Several tables key their person columns to `auth.users`. That is
-- correct as a constraint and useless as a relationship: `auth.users` is
-- not exposed through the API, so a query asking for a project together
-- with its members' names finds no path between the two tables and
-- FAILS — not returning fewer rows, but an error, which the application
-- read as "no projects".
--
-- `profiles` is the same identity: exactly one row per account, created
-- by a trigger at signup and removed with the account. Keying to it as
-- well states the relationship the API needs without weakening the one
-- that guarantees the account exists.
--
-- Every step asks what the database actually has rather than assuming a
-- history, so this is safe on a fresh project, on one built from an
-- earlier draft, and safe to run twice.

-- A missing profile would make the new keys unaddable. `handle_new_user`
-- creates one per signup, but an account that predates that trigger — or
-- one made straight in the dashboard — has none.
insert into public.profiles (id, full_name, avatar_url)
select u.id, coalesce(u.raw_user_meta_data ->> 'full_name', ''), u.raw_user_meta_data ->> 'avatar_url'
from auth.users u
on conflict (id) do nothing;

/*
  Adds a key from `tbl.col` to `profiles`, unless one is already there.

  The test is on where the constraint POINTS, not on what it is called.
  Testing the name would add a second, identically-shaped key to a table
  that is already correct — and two paths between the same pair of tables
  make the embed ambiguous, breaking exactly what this is meant to fix.
*/
create or replace function pg_temp.ensure_profile_fk(tbl text, col text, on_delete text)
returns void
language plpgsql
as $$
declare
  already boolean;
begin
  select exists (
    select 1
    from pg_constraint c
    join pg_class referenced on referenced.oid = c.confrelid
    join pg_namespace rn on rn.oid = referenced.relnamespace
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
    where c.contype = 'f'
      and c.conrelid = ('public.' || tbl)::regclass
      and rn.nspname = 'public'
      and referenced.relname = 'profiles'
      and a.attname = col
  ) into already;

  if already then
    raise notice '% .% already reaches profiles', tbl, col;
    return;
  end if;

  execute format(
    'alter table public.%I add constraint %I foreign key (%I) references public.profiles (id) on delete %s',
    tbl, tbl || '_' || col || '_profile_fkey', col, on_delete
  );
  raise notice 'linked %.% to profiles', tbl, col;
end;
$$;

select pg_temp.ensure_profile_fk('workspace_members', 'user_id',     'cascade');
select pg_temp.ensure_profile_fk('project_members',   'user_id',     'cascade');
select pg_temp.ensure_profile_fk('task_assignees',    'user_id',     'cascade');
select pg_temp.ensure_profile_fk('task_comments',     'author_id',   'cascade');
select pg_temp.ensure_profile_fk('task_attachments',  'uploaded_by', 'cascade');
select pg_temp.ensure_profile_fk('task_activity',     'actor_id',    'set null');

-- PostgREST caches the relationships it knows about. Without this it
-- keeps answering "no relationship found" until the project restarts or
-- it happens to reload on its own.
notify pgrst, 'reload schema';
