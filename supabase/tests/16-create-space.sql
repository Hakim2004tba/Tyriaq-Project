\set ON_ERROR_STOP on
\pset pager off

-- Creating a space, and the RETURNING trap underneath it.
--
-- The bug: `INSERT ... RETURNING` needs SELECT on the new row. Once
-- seeing a space meant being a member of it, the creator could insert a
-- space and then not read it back — and Postgres reports that as "new
-- row violates row-level security policy", which points at the insert
-- rather than the read.

insert into auth.users (id, email, raw_user_meta_data) values
  ('f1111111-0000-0000-0000-000000000001', 'boss4@example.com',   '{"full_name":"Boss Four"}'),
  ('f1111111-0000-0000-0000-000000000002', 'member4@example.com', '{"full_name":"Member Four"}')
on conflict (id) do nothing;

begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"f1111111-0000-0000-0000-000000000001"}';

\echo '1. The owner creates a space and can immediately see it'
select id as ws from public.create_workspace('Making Spaces', 'making-spaces') \gset
insert into public.workspace_members (workspace_id, user_id, role)
values (:'ws', 'f1111111-0000-0000-0000-000000000002', 'member');

select id as sp from public.create_space('Marketing', 'marketing', 'Campaigns', 'megaphone', 'rose') \gset
select count(*) = 1 as creator_sees_it from public.spaces where id = :'sp';
select name = 'Marketing' and description = 'Campaigns' as fields_kept
from public.spaces where id = :'sp';

\echo '2. and is its admin, so they can immediately add somebody'
select level::text = 'admin' as creator_is_space_admin
from public.space_members where space_id = :'sp' and user_id = auth.uid();
insert into public.space_members (space_id, user_id, workspace_id, level)
values (:'sp', 'f1111111-0000-0000-0000-000000000002', :'ws', 'editor');
select count(*) = 2 as two_members from public.space_members where space_id = :'sp';

\echo '3. A plain member can create a space of their own'
set local request.jwt.claims = '{"sub":"f1111111-0000-0000-0000-000000000002"}';
select id as own from public.create_space('Personal', 'personal') \gset
select count(*) = 1 as they_see_their_own from public.spaces where id = :'own';
select level::text = 'admin' as they_admin_their_own
from public.space_members where space_id = :'own' and user_id = auth.uid();

\echo '4. A colliding slug is resolved rather than refused'
-- The owner has a space this member cannot see, so the app cannot pick
-- a free slug by looking — the function has to.
--
-- Created in its own statement: a function call inside a WHERE clause
-- writes the row, but the statement's snapshot was taken before it
-- existed, so the comparison finds nothing.
select (public.create_space('Marketing', 'marketing')).slug as chosen \gset
select :'chosen' = 'marketing-2' as slug_resolved;

\echo '5. Somebody in no workspace at all is refused, not crashed'
set local role postgres;
delete from public.workspace_members where user_id = 'f1111111-0000-0000-0000-000000000002';
set local role authenticated;
do $$
begin
  perform public.create_space('Nowhere', 'nowhere');
  raise exception 'FAIL: made a space with no workspace';
exception when sqlstate 'P0001' then raise notice 'PASS: %', sqlerrm;
end $$;

rollback;
