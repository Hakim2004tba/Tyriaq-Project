\set ON_ERROR_STOP on
\pset pager off

-- Statuses a project defines for itself, and the invariant underneath:
-- `tasks.status` must always agree with the column the task is in, or
-- every report about finished work is wrong.

insert into auth.users (id, email, raw_user_meta_data) values
  ('a3333333-0000-0000-0000-000000000001', 'shop@example.com', '{"full_name":"Shop Owner"}')
on conflict (id) do nothing;

begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"a3333333-0000-0000-0000-000000000001"}';

\echo '1. A project with no custom statuses behaves exactly as before'
select id as ws from public.create_workspace('Print Co', 'print-co') \gset
select id as sp from public.create_space('Shop', 'shop') \gset
select id as pj from public.create_project(:'sp', 'Banners', 'banners', '', 'violet') \gset
select id as t1 from public.create_task(:'pj', 'A2 banner') \gset
select status::text = 'todo' and status_id is null as untouched
from public.tasks where id = :'t1';

\echo '2. Seeding gives it the five defaults and files existing work into them'
select count(*) = 5 as five_columns from public.seed_project_statuses(:'pj');
select s.name = 'To do' as existing_task_filed
from public.tasks t join public.project_statuses s on s.id = t.status_id
where t.id = :'t1';

\echo '3. Renaming a column does not change what it means'
update public.project_statuses set name = 'Designing'
where project_id = :'pj' and category = 'in_progress';
update public.tasks set status_id = (
  select id from public.project_statuses where project_id = :'pj' and name = 'Designing'
) where id = :'t1';
select status::text = 'in_progress' as category_followed from public.tasks where id = :'t1';

\echo '4. Changing a category re-files every task in that column'
update public.project_statuses set category = 'done'
where project_id = :'pj' and name = 'Designing';
select status::text = 'done' as tasks_recategorised from public.tasks where id = :'t1';

\echo '5. A task cannot borrow another project''s column'
select id as pj2 from public.create_project(:'sp', 'Stickers', 'stickers', '', 'blue') \gset
select id as t2 from public.create_task(:'pj2', 'Round stickers') \gset
do $$
begin
  update public.tasks set status_id = (
    select id from public.project_statuses where name = 'Designing' limit 1
  ) where title = 'Round stickers';
  raise exception 'FAIL: a task borrowed another board''s column';
exception when sqlstate 'P0001' then raise notice 'PASS: %', sqlerrm;
end $$;

\echo '6. Two columns cannot share a name on one board'
do $$
begin
  insert into public.project_statuses (project_id, workspace_id, name, category)
  select p.id, p.workspace_id, 'designing', 'todo' from public.projects p where p.slug = 'banners';
  raise exception 'FAIL: a duplicate column name was accepted';
exception when unique_violation then raise notice 'PASS: %', 'one column per name per board';
end $$;

\echo '7. Seeding twice is not five more columns'
select count(*) = 5 as still_five from public.seed_project_statuses(:'pj');

rollback;
