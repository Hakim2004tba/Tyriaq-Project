\set ON_ERROR_STOP on
\pset pager off

-- Removing people, and the two removals that must never happen.

insert into auth.users (id, email, raw_user_meta_data) values
  ('cccccccc-0000-0000-0000-000000000001', 'owner2@example.com', '{"full_name":"Owner Two"}'),
  ('cccccccc-0000-0000-0000-000000000002', 'admin2@example.com', '{"full_name":"Admin Two"}'),
  ('cccccccc-0000-0000-0000-000000000003', 'temp@example.com',   '{"full_name":"Temp Person"}')
on conflict (id) do nothing;

begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"cccccccc-0000-0000-0000-000000000001"}';

\echo '1. A workspace with an owner, an admin and somebody passing through'
select id as ws from public.create_workspace('Leaving Co', 'leaving-co') \gset
insert into public.spaces (workspace_id, name, slug, created_by)
values (:'ws', 'Studio', 'studio', auth.uid());
select id as sp from public.spaces where slug = 'studio' \gset
select id as pj from public.create_project(:'sp', 'Work', 'work', '', 'violet') \gset
select id as t1 from public.create_task(:'pj', 'Something they did') \gset

insert into public.workspace_members (workspace_id, user_id, role) values
  (:'ws', 'cccccccc-0000-0000-0000-000000000002', 'admin'),
  (:'ws', 'cccccccc-0000-0000-0000-000000000003', 'member');
insert into public.space_members (space_id, user_id, workspace_id, level) values
  (:'sp', auth.uid(), :'ws', 'admin'),
  (:'sp', 'cccccccc-0000-0000-0000-000000000003', :'ws', 'editor');
insert into public.project_members (project_id, user_id, role, level)
values (:'pj', 'cccccccc-0000-0000-0000-000000000003', 'member', 'viewer');
insert into public.task_assignees (task_id, user_id, workspace_id)
values (:'t1', 'cccccccc-0000-0000-0000-000000000003', :'ws');
-- Written AS them: the comment policy insists an author writes their
-- own words, which is the rule being relied on further down.
set local request.jwt.claims = '{"sub":"cccccccc-0000-0000-0000-000000000003"}';
insert into public.task_comments (task_id, workspace_id, author_id, body)
values (:'t1', :'ws', auth.uid(), 'I did the thing');
set local request.jwt.claims = '{"sub":"cccccccc-0000-0000-0000-000000000001"}';

\echo '2. An admin cannot remove the owner'
-- As the admin: an owner removing themselves would hit the "not
-- yourself" rule first, which is a different refusal from the one this
-- is here to prove.
set local request.jwt.claims = '{"sub":"cccccccc-0000-0000-0000-000000000002"}';
do $$
begin
  perform public.remove_from_workspace(
    (select id from public.workspaces where slug = 'leaving-co'),
    'cccccccc-0000-0000-0000-000000000001'
  );
  raise exception 'FAIL: the owner was removed';
exception when sqlstate 'P0001' then
  if sqlerrm like '%owner cannot be removed%' then
    raise notice 'PASS: %', sqlerrm;
  else
    raise exception 'FAIL: wrong refusal — %', sqlerrm;
  end if;
end $$;

\echo '3. Nor from a space — the button is hidden, and the rule holds anyway'
set local request.jwt.claims = '{"sub":"cccccccc-0000-0000-0000-000000000001"}';
do $$
begin
  delete from public.space_members
  where user_id = 'cccccccc-0000-0000-0000-000000000001';
  raise exception 'FAIL: the owner left the space';
exception when sqlstate 'P0001' then raise notice 'PASS: %', sqlerrm;
end $$;

\echo '4. Nobody can remove themselves'
set local request.jwt.claims = '{"sub":"cccccccc-0000-0000-0000-000000000002"}';
do $$
begin
  perform public.remove_from_workspace(
    (select id from public.workspaces where slug = 'leaving-co'),
    'cccccccc-0000-0000-0000-000000000002'
  );
  raise exception 'FAIL: removed themselves';
exception when sqlstate 'P0001' then raise notice 'PASS: %', sqlerrm;
end $$;

\echo '5. A member cannot remove anybody'
set local request.jwt.claims = '{"sub":"cccccccc-0000-0000-0000-000000000003"}';
do $$
begin
  perform public.remove_from_workspace(
    (select id from public.workspaces where slug = 'leaving-co'),
    'cccccccc-0000-0000-0000-000000000002'
  );
  raise exception 'FAIL: a member removed an admin';
exception when sqlstate 'P0001' then raise notice 'PASS: %', sqlerrm;
end $$;

\echo '6. An admin removes the temporary person, and every grant goes with them'
set local request.jwt.claims = '{"sub":"cccccccc-0000-0000-0000-000000000002"}';
select public.remove_from_workspace(:'ws', 'cccccccc-0000-0000-0000-000000000003');

set local role postgres;
select
  (select count(*) = 0 from public.workspace_members
    where workspace_id = :'ws' and user_id = 'cccccccc-0000-0000-0000-000000000003') as workspace_gone,
  (select count(*) = 0 from public.space_members
    where workspace_id = :'ws' and user_id = 'cccccccc-0000-0000-0000-000000000003') as space_gone,
  (select count(*) = 0 from public.project_members
    where user_id = 'cccccccc-0000-0000-0000-000000000003') as project_gone,
  (select count(*) = 0 from public.task_assignees
    where user_id = 'cccccccc-0000-0000-0000-000000000003') as unassigned,
  -- What they wrote stays: history is not rewritten because somebody left.
  (select count(*) = 1 from public.task_comments
    where author_id = 'cccccccc-0000-0000-0000-000000000003') as their_words_remain;

\echo '7. And they can see nothing afterwards'
set local role authenticated;
set local request.jwt.claims = '{"sub":"cccccccc-0000-0000-0000-000000000003"}';
select
  (select count(*) = 0 from public.spaces where id = :'sp') as space_invisible,
  (select count(*) = 0 from public.tasks where id = :'t1') as tasks_invisible;

rollback;
