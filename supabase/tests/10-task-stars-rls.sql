\set ON_ERROR_STOP on
\pset pager off

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com', '{"full_name":"Alice Ait"}'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com',   '{"full_name":"Bob Belkacem"}')
on conflict (id) do nothing;

begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

\echo '1. Alice stars a task; the workspace is derived from it'
select id as ws from public.create_workspace('Star Co', 'star-co') \gset
insert into public.workspace_members (workspace_id, user_id, role)
values (:'ws', '22222222-2222-2222-2222-222222222222', 'member');
insert into public.spaces (workspace_id, name, slug, created_by)
values (:'ws', 'Product', 'product', auth.uid());
select id as sp from public.spaces where slug = 'product' \gset

/*
  Bob is put in the SPACE, not only the workspace.

  Workspace membership stopped implying visibility when spaces became a
  boundary — see 12-space-isolation. Without this, Bob can see none of
  Alice's work, and the assertions below stop testing what they were
  written to test: that a colleague who CAN see the work still cannot
  act under somebody else's name.
*/
insert into public.space_members (space_id, user_id, workspace_id, level)
values (:'sp', '22222222-2222-2222-2222-222222222222', :'ws', 'editor');

select id as pj from public.create_project(:'sp', 'Website', 'website', '', 'violet') \gset
select id as t1 from public.create_task(:'pj', 'Design the hero') \gset

insert into public.task_stars (task_id, user_id, workspace_id)
values (:'t1', auth.uid(), '00000000-0000-0000-0000-000000000000');
select workspace_id = :'ws' as workspace_derived from public.task_stars;

\echo '2. a star is personal — Bob sees none of hers'
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select count(*) as visible_to_bob from public.task_stars;

\echo '3. and he cannot star on her behalf'
do $$
begin
  insert into public.task_stars (task_id, user_id, workspace_id)
  select id, '11111111-1111-1111-1111-111111111111', workspace_id from public.tasks limit 1;
  raise exception 'FAIL: starred a task for somebody else';
exception when insufficient_privilege then raise notice 'PASS: stars are the owner''s alone';
end $$;

\echo '4. he can star the same task for himself, independently'
insert into public.task_stars (task_id, user_id, workspace_id)
values (:'t1', auth.uid(), :'ws');
select count(*) as his_stars from public.task_stars;

\echo '5. unstarring removes only his own'
delete from public.task_stars;
select count(*) as left_for_bob from public.task_stars;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select count(*) as hers_survived from public.task_stars;

\echo '6. deleting the task takes the star with it'
delete from public.tasks where id = :'t1';
select count(*) as stars_after_delete from public.task_stars;

rollback;
