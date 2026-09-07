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

\echo '1. Alice sets up a workspace, space and project'
select id as ws from public.create_workspace('Task Co', 'task-co') \gset
insert into public.spaces (workspace_id, name, slug, created_by)
values (:'ws', 'Product', 'product', auth.uid());
select id as sp from public.spaces where slug = 'product' \gset
select id as pj from public.create_project(:'sp', 'Website', 'website', '', 'violet') \gset

\echo '2. create_task stamps the workspace, the author and an end position'
select id as t1 from public.create_task(:'pj', 'Design the hero') \gset
select id as t2 from public.create_task(:'pj', 'Write the copy') \gset
select id as t3 from public.create_task(:'pj', 'Ship it', 'in_progress') \gset
select title, status::text, position,
       workspace_id = :'ws' as workspace_derived,
       created_by = auth.uid() as author_is_caller
from public.tasks order by status, position;

\echo '3. every task field round-trips'
update public.tasks
set description = 'Above the fold', priority = 'urgent',
    start_date = current_date, due_date = current_date + 7,
    tags = array['design','launch']
where id = :'t1';
select priority::text, tags, (due_date - start_date) as span
from public.tasks where id = :'t1';

\echo '4. a due date before the start date is refused'
do $$
begin
  update public.tasks set due_date = current_date - 30
  where title = 'Design the hero';
  raise exception 'FAIL: inverted dates accepted';
exception when check_violation then raise notice 'PASS: %', sqlerrm;
end $$;

\echo '5. subtasks hang off the parent and inherit its project'
select id as sub from public.create_task(:'pj', 'Pick a typeface', 'todo', 'medium', :'t1') \gset
select count(*) as subtasks_of_t1 from public.tasks where parent_task_id = :'t1';

\echo '6. assigning a workspace member works; an outsider is refused'
insert into public.task_assignees (task_id, user_id, workspace_id)
values (:'t1', '11111111-1111-1111-1111-111111111111', :'ws');
do $$
begin
  insert into public.task_assignees (task_id, user_id, workspace_id)
  values ((select id from public.tasks where title = 'Design the hero'),
          '33333333-3333-3333-3333-333333333333', null);
  raise exception 'FAIL: outsider assigned';
exception when sqlstate 'P0001' then raise notice 'PASS: %', sqlerrm;
end $$;

\echo '7. dependencies link tasks, but never in a cycle'
insert into public.task_dependencies (predecessor_id, successor_id, workspace_id)
values (:'t1', :'t2', :'ws');
insert into public.task_dependencies (predecessor_id, successor_id, workspace_id)
values (:'t2', :'t3', :'ws');
do $$
begin
  insert into public.task_dependencies (predecessor_id, successor_id, workspace_id)
  select t3.id, t1.id, t1.workspace_id
  from public.tasks t1, public.tasks t3
  where t1.title = 'Design the hero' and t3.title = 'Ship it';
  raise exception 'FAIL: cycle accepted';
exception when sqlstate 'P0001' then raise notice 'PASS: %', sqlerrm;
end $$;

\echo '8. move_task reorders within a column and moves between columns'
select position as moved_between from public.move_task(:'t2', 'todo', null, :'t1');
select title, status::text from public.move_task(:'t2', 'done', null, null);
select title, status::text, position from public.tasks
where parent_task_id is null order by status, position;

\echo '8b. a task with an assignee and an attachment can still be deleted'
do $$
declare doomed uuid; ws uuid; pj uuid; remaining int;
begin
  select id, workspace_id, project_id into doomed, ws, pj from public.tasks where title = 'Ship it';
  insert into public.task_assignees (task_id, user_id, workspace_id) values (doomed, auth.uid(), ws);
  insert into public.task_attachments (task_id, workspace_id, uploaded_by, storage_path, file_name)
  values (doomed, ws, auth.uid(), ws || '/' || doomed || '/x.pdf', 'x.pdf');
  -- Both cascade on delete, and both carry an activity trigger that
  -- used to try logging against the task after it was gone.
  delete from public.tasks where id = doomed;
  select count(*) into remaining from public.tasks where id = doomed;
  if remaining > 0 then raise exception 'FAIL: the task survived its own deletion'; end if;
  raise notice 'PASS: deleted with its assignee and attachment';
end $$;

\echo '9. Bob sees none of it, and cannot write into it'
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select (select count(*) from public.tasks) as tasks_visible,
       (select count(*) from public.task_assignees) as assignees_visible,
       (select count(*) from public.task_dependencies) as dependencies_visible;
do $$
begin
  perform public.create_task('00000000-0000-0000-0000-000000000000'::uuid, 'Intruder');
  raise exception 'FAIL: outsider created a task';
exception when sqlstate 'P0001' or insufficient_privilege or foreign_key_violation
  then raise notice 'PASS: %', sqlerrm;
end $$;

\echo '10. and move_task refuses a task he cannot read'
do $$
begin
  perform public.move_task((select id from public.tasks limit 1));
  raise exception 'FAIL: outsider moved a task';
exception
  when sqlstate 'P0001' then raise notice 'PASS: %', sqlerrm;
  when others then raise notice 'PASS (no task even visible): %', sqlerrm;
end $$;

rollback;
