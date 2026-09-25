\set ON_ERROR_STOP on
\pset pager off

-- Saved views: mine are mine, shared ones are the team's.

insert into auth.users (id, email, raw_user_meta_data) values
  ('a9999999-0000-0000-0000-000000000001', 'views-lead@example.com', '{"full_name":"A Lead"}'),
  ('a9999999-0000-0000-0000-000000000002', 'views-dev@example.com',  '{"full_name":"A Dev"}')
on conflict (id) do nothing;

begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"a9999999-0000-0000-0000-000000000001"}';

\echo '1. A project both people can reach'
select id as ws from public.create_workspace('Views Co', 'views-co') \gset
select id as sp from public.create_space('Studio', 'studio') \gset
select id as pj from public.create_project(:'sp', 'Launch', 'launch', '', 'violet') \gset
insert into public.workspace_members (workspace_id, user_id, role)
values (:'ws', 'a9999999-0000-0000-0000-000000000002', 'member');
insert into public.space_members (space_id, user_id, workspace_id, level)
values (:'sp', 'a9999999-0000-0000-0000-000000000002', :'ws', 'editor');

\echo '2. The lead saves one private view and one shared'
insert into public.saved_views (workspace_id, project_id, name, layout, config, is_shared, created_by)
values
  (:'ws', :'pj', 'My week', 'list', '{"sort":"due"}'::jsonb, false, auth.uid()),
  (:'ws', :'pj', 'The backlog', 'list', '{"sort":"priority"}'::jsonb, true, auth.uid());
select count(*) = 2 as lead_sees_both from public.saved_views;

\echo '3. The other person sees the shared one only'
set local request.jwt.claims = '{"sub":"a9999999-0000-0000-0000-000000000002"}';
select count(*) = 1 as sees_only_shared from public.saved_views;
select name = 'The backlog' as and_it_is_the_shared_one from public.saved_views;

\echo '4. and cannot edit or delete somebody else''s'
do $$
declare touched int;
begin
  update public.saved_views set name = 'Mine now';
  get diagnostics touched = row_count;
  if touched > 0 then raise exception 'FAIL: renamed a view they do not own'; end if;
  delete from public.saved_views;
  get diagnostics touched = row_count;
  if touched > 0 then raise exception 'FAIL: deleted a view they do not own'; end if;
  raise notice 'PASS: views belong to whoever made them';
end $$;

\echo '5. They can save their own, and the lead does not see it'
insert into public.saved_views (workspace_id, project_id, name, layout, config, is_shared, created_by)
values (:'ws', :'pj', 'Just mine', 'board', '{}'::jsonb, false, auth.uid());
select count(*) = 2 as they_see_theirs_and_the_shared from public.saved_views;
set local request.jwt.claims = '{"sub":"a9999999-0000-0000-0000-000000000001"}';
select count(*) = 2 as lead_still_sees_two from public.saved_views;

\echo '6. Somebody outside the space sees none of it'
set local role postgres;
delete from public.space_members
where space_id = :'sp' and user_id = 'a9999999-0000-0000-0000-000000000002';
set local role authenticated;
set local request.jwt.claims = '{"sub":"a9999999-0000-0000-0000-000000000002"}';
select count(*) = 0 as removed_person_sees_nothing from public.saved_views;

rollback;
