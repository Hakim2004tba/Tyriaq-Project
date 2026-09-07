\set ON_ERROR_STOP on
\pset pager off

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com', '{"full_name":"Alice Ait"}'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com',   '{"full_name":"Bob Belkacem"}'),
  ('33333333-3333-3333-3333-333333333333', 'carla@example.com', '{"full_name":"Carla Cherif"}')
on conflict (id) do nothing;

begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

\echo '1. a workspace with Bob in it, a project and a task'
select id as ws from public.create_workspace('Time Co', 'time-co') \gset
insert into public.workspace_members (workspace_id, user_id, role)
values (:'ws', '22222222-2222-2222-2222-222222222222', 'member');
insert into public.spaces (workspace_id, name, slug, created_by)
values (:'ws', 'Product', 'product', auth.uid());
select id as sp from public.spaces where slug = 'product' \gset
select id as pj from public.create_project(:'sp', 'Website', 'website', '', 'violet') \gset
select id as t1 from public.create_task(:'pj', 'Design the hero') \gset

\echo '2. logging time derives the workspace and the project from the task'
insert into public.time_entries (task_id, workspace_id, project_id, user_id, minutes, note)
values (:'t1', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000',
        auth.uid(), 90, 'first pass');
select minutes, workspace_id = :'ws' as workspace_derived, project_id = :'pj' as project_derived
from public.time_entries;

\echo '3. and it appears in the task history'
select kind::text, text from public.task_activity where kind = 'logged';

\echo '4. impossible durations are refused'
do $$
begin
  insert into public.time_entries (task_id, workspace_id, project_id, user_id, minutes)
  select id, workspace_id, project_id, auth.uid(), 5000 from public.tasks limit 1;
  raise exception 'FAIL: accepted more than a day in one entry';
exception when check_violation then raise notice 'PASS: %', sqlerrm;
end $$;

\echo '5. Bob sees the team total but cannot log time as Alice'
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select count(*) as entries_visible, sum(minutes) as minutes_visible from public.time_entries;
do $$
begin
  insert into public.time_entries (task_id, workspace_id, project_id, user_id, minutes)
  select id, workspace_id, project_id, '11111111-1111-1111-1111-111111111111', 30
  from public.tasks limit 1;
  raise exception 'FAIL: logged time under somebody else''s name';
exception when insufficient_privilege then raise notice 'PASS: policy refused the write';
end $$;

\echo '6. nor edit or delete hers'
do $$
declare touched int;
begin
  update public.time_entries set minutes = 1 where user_id = '11111111-1111-1111-1111-111111111111';
  get diagnostics touched = row_count;
  if touched > 0 then raise exception 'FAIL: % of her entries changed', touched; end if;
  delete from public.time_entries where user_id = '11111111-1111-1111-1111-111111111111';
  get diagnostics touched = row_count;
  if touched > 0 then raise exception 'FAIL: % of her entries deleted', touched; end if;
  raise notice 'PASS: her hours are hers';
end $$;

\echo '7. he logs his own, and the workspace total reflects both'
insert into public.time_entries (task_id, workspace_id, project_id, user_id, minutes, spent_on)
values (:'t1', :'ws', :'pj', auth.uid(), 45, current_date - 1);
select count(*) as entries, sum(minutes) as total_minutes from public.time_entries;

\echo '8. an outsider sees none of it'
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';
select count(*) as entries_visible_to_outsider from public.time_entries;

rollback;
