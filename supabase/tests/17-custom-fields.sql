\set ON_ERROR_STOP on
\pset pager off

-- Custom fields: who may define one, who may fill one in, and the two
-- ways a value could end up somewhere it does not belong.

insert into auth.users (id, email, raw_user_meta_data) values
  ('a2222222-0000-0000-0000-000000000001', 'lead@example.com',  '{"full_name":"Lead"}'),
  ('a2222222-0000-0000-0000-000000000002', 'hand@example.com',  '{"full_name":"A Hand"}')
on conflict (id) do nothing;

begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"a2222222-0000-0000-0000-000000000001"}';

\echo '1. An admin defines a workspace field and a project field'
select id as ws from public.create_workspace('Fields Co', 'fields-co') \gset
select id as sp from public.create_space('Studio', 'studio') \gset
select id as pj from public.create_project(:'sp', 'Campaign', 'campaign', '', 'violet') \gset
select id as t1 from public.create_task(:'pj', 'Print the banner') \gset

insert into public.custom_fields (workspace_id, project_id, name, field_type, created_by)
values (:'ws', null, 'Client', 'text', auth.uid());
insert into public.custom_fields (workspace_id, project_id, name, field_type, options, created_by)
values (:'ws', :'pj', 'Print run', 'select',
        '[{"id":"a","label":"100"},{"id":"b","label":"500"}]'::jsonb, auth.uid());
select count(*) = 2 as both_defined from public.custom_fields;

\echo '2. A select with no options is refused, and so is a text field with some'
do $$
begin
  insert into public.custom_fields (workspace_id, project_id, name, field_type, created_by)
  select id, null, 'Broken', 'select', auth.uid() from public.workspaces where slug = 'fields-co';
  raise exception 'FAIL: a select with no options was accepted';
exception when check_violation then raise notice 'PASS: %', 'a list field needs options';
end $$;

\echo '3. Two fields cannot share a name in the same scope'
do $$
begin
  insert into public.custom_fields (workspace_id, project_id, name, field_type, created_by)
  select id, null, 'client', 'number', auth.uid() from public.workspaces where slug = 'fields-co';
  raise exception 'FAIL: a duplicate name was accepted';
exception when unique_violation then raise notice 'PASS: %', 'one field per name per scope';
end $$;

\echo '4. Filling one in stamps the workspace from the task, not the caller'
select id as f_client from public.custom_fields where name = 'Client' \gset
insert into public.task_custom_field_values (task_id, field_id, workspace_id, value)
values (:'t1', :'f_client', '00000000-0000-0000-0000-000000000000', '"ACME"'::jsonb);
select workspace_id = :'ws' as workspace_derived from public.task_custom_field_values;

\echo '5. A project field cannot be filled in on a task from another project'
select id as pj2 from public.create_project(:'sp', 'Other', 'other', '', 'blue') \gset
select id as t2 from public.create_task(:'pj2', 'Unrelated') \gset
select id as f_run from public.custom_fields where name = 'Print run' \gset
do $$
begin
  insert into public.task_custom_field_values (task_id, field_id, workspace_id, value)
  select t.id, f.id, t.workspace_id, '"a"'::jsonb
  from public.tasks t, public.custom_fields f
  where t.title = 'Unrelated' and f.name = 'Print run';
  raise exception 'FAIL: a project field escaped its project';
exception when sqlstate 'P0001' then raise notice 'PASS: %', sqlerrm;
end $$;

\echo '6. An ordinary member fills a field in, but cannot define one'
set local role postgres;
insert into public.workspace_members (workspace_id, user_id, role)
values (:'ws', 'a2222222-0000-0000-0000-000000000002', 'member');
insert into public.space_members (space_id, user_id, workspace_id, level)
values (:'sp', 'a2222222-0000-0000-0000-000000000002', :'ws', 'editor');
set local role authenticated;
set local request.jwt.claims = '{"sub":"a2222222-0000-0000-0000-000000000002"}';

select count(*) = 2 as member_sees_the_definitions from public.custom_fields;
insert into public.task_custom_field_values (task_id, field_id, workspace_id, value)
values (:'t1', :'f_run', :'ws', '"b"'::jsonb);
select count(*) = 2 as member_wrote_a_value from public.task_custom_field_values;

do $$
begin
  insert into public.custom_fields (workspace_id, project_id, name, field_type, created_by)
  select id, null, 'Sneaky', 'text', auth.uid() from public.workspaces where slug = 'fields-co';
  raise exception 'FAIL: a member defined a workspace field';
exception when insufficient_privilege then raise notice 'PASS: %', 'defining a column is for managers';
end $$;

\echo '7. Somebody outside the space sees neither definitions nor values'
set local role postgres;
delete from public.space_members
where user_id = 'a2222222-0000-0000-0000-000000000002';
set local role authenticated;
select count(*) = 1 as only_the_workspace_field from public.custom_fields;
select count(*) = 0 as no_values_visible from public.task_custom_field_values;

\echo '8. Archiving keeps the values and frees the name'
set local request.jwt.claims = '{"sub":"a2222222-0000-0000-0000-000000000001"}';
update public.custom_fields set archived = true where id = :'f_client';
set local role postgres;
select count(*) = 2 as values_kept from public.task_custom_field_values;
set local role authenticated;
insert into public.custom_fields (workspace_id, project_id, name, field_type, created_by)
values (:'ws', null, 'Client', 'number', auth.uid());
select count(*) = 1 as name_reused
from public.custom_fields where name = 'Client' and archived = false;

rollback;
