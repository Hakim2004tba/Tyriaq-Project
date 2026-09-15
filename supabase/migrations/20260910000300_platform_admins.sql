-- Tyriaq — who may open the back office
--
-- `/admin` has been gated on `requireUser()` — that is, on being signed
-- in at all. Every page there draws sample data, so today it is a lock
-- on an empty room, and the comment in the layout says as much.
--
-- The moment any of those pages reads a real subscription, that gate
-- becomes a hole: every customer could read every other customer's
-- billing. So the role comes first, and the data after it.
--
-- A table rather than a column on `profiles`, because this is not a
-- property of a person the way their name is — it is a grant, it wants a
-- record of who made it and when, and it should be revocable by deleting
-- a row rather than by flipping a boolean nobody notices.

create table if not exists public.platform_admins (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  granted_by uuid references public.profiles (id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;

/*
  Readable only by the people in it.

  Anybody else asking gets an empty set rather than a refusal, which is
  the same answer they would get if the table were empty — there is no
  reason for a customer to be able to learn that a staff list exists, let
  alone who is on it.
*/
drop policy if exists "platform admins read the list" on public.platform_admins;
create policy "platform admins read the list"
  on public.platform_admins for select
  to authenticated
  using (exists (
    select 1 from public.platform_admins a where a.user_id = (select auth.uid())
  ));

/*
  No insert, update or delete policy at all.

  The first platform admin is added with SQL, by somebody holding the
  database credentials. There is no path from a browser session to
  granting yourself the back office, and that is the property worth
  having — the alternative is one bug away from every workspace's data.
*/

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.platform_admins a where a.user_id = auth.uid()
  );
$$;

grant execute on function public.is_platform_admin() to authenticated;

/*
  To make somebody staff, run this as the database owner:

    insert into public.platform_admins (user_id, note)
    select id, 'founder' from auth.users where email = 'you@example.com';
*/
