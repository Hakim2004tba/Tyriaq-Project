-- Tyriaq — repair: things a database built from an earlier draft is missing.
--
-- Paste this into the Supabase SQL editor. It fixes:
--   1. person columns the API cannot follow, which made projects,
--      members and comments come back empty;
--   2. storage policies that depended on an owner column Supabase is in
--      the middle of renaming, which could refuse every upload.
--
-- It checks what your database actually has before changing anything,
-- so it is safe on any Tyriaq database and safe to run more than once.

-- ============================================================
-- 20260904001800_profile_relationships.sql
-- ============================================================
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

-- ============================================================
-- 20260904001900_storage_owner.sql
-- ============================================================
-- Tyriaq — storage policies that do not depend on which owner column
-- this Supabase version has.
--
-- The original policies asked `owner = auth.uid()`. Supabase has been
-- moving object ownership from `owner` (uuid) to `owner_id` (text), and
-- a project where `owner` is no longer populated would refuse every
-- upload — with the storage API reporting only "new row violates
-- row-level security policy", which says nothing about which column is
-- to blame.
--
-- So: uploading is gated on the path prefix alone, which is the real
-- boundary — the leading segment is the workspace, and only its members
-- may write there. Ownership then decides deletion, read from whichever
-- column this installation actually has.

drop policy if exists "members upload task files" on storage.objects;
drop policy if exists "uploaders and admins delete task files" on storage.objects;

/*
  Uploads: workspace membership, by path.

  Dropping the owner condition does not widen who may write — the same
  people could always write here — it only stops the check depending on
  a column whose meaning is in flux. Who uploaded what is recorded in
  `task_attachments.uploaded_by`, from `auth.uid()`, which is the copy
  the product actually reads.
*/
create policy "members upload task files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'task-files'
    and public.is_workspace_member(nullif(split_part(name, '/', 1), '')::uuid)
  );

do $$
declare
  owner_test text;
begin
  -- Whichever column exists is used; where both do, either matching is
  -- enough, so the policy keeps working across an upgrade in either
  -- direction rather than only after one.
  owner_test := concat_ws(' or ',
    case when exists (
      select 1 from pg_attribute
      where attrelid = 'storage.objects'::regclass and attname = 'owner' and not attisdropped
    ) then 'owner = auth.uid()' end,
    case when exists (
      select 1 from pg_attribute
      where attrelid = 'storage.objects'::regclass and attname = 'owner_id' and not attisdropped
    ) then 'owner_id = auth.uid()::text' end
  );

  if owner_test = '' then
    -- Neither column: fall back to workspace admin, so files stay
    -- removable rather than becoming permanent.
    owner_test := 'false';
  end if;

  execute format($f$
    create policy "uploaders and admins delete task files"
      on storage.objects for delete
      to authenticated
      using (
        bucket_id = 'task-files'
        and (
          (%s)
          or public.is_workspace_admin(nullif(split_part(name, '/', 1), '')::uuid)
        )
      )
  $f$, owner_test);
end $$;

notify pgrst, 'reload schema';
