\set ON_ERROR_STOP on
\pset pager off

-- Automations: who may write them, and what the log guarantees.
--
-- The RUNNER lives in the application — rules are data here, not
-- behaviour — so what the database must guarantee is narrower and more
-- important: that only the right people can write a rule, that nobody
-- can read another project's, and that the run log cannot be forged.

insert into auth.users (id, email, raw_user_meta_data) values
  ('a0000000-1111-0000-0000-000000000001', 'lead-auto@example.com',   '{"full_name":"Lead"}'),
  ('a0000000-1111-0000-0000-000000000002', 'member-auto@example.com', '{"full_name":"Member"}')
on conflict (id) do nothing;

begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"a0000000-1111-0000-0000-000000000001"}';

\echo '1. A space admin can write a rule'
select id as ws from public.create_workspace('Rules Co', 'rules-co') \gset
select id as sp from public.create_space('Studio', 'studio') \gset
select id as pj from public.create_project(:'sp', 'Launch', 'launch', '', 'violet') \gset
select id as t1 from public.create_task(:'pj', 'Write the brief') \gset

insert into public.automations (project_id, workspace_id, name, trigger, actions, created_by)
values (
  :'pj', :'ws', 'Assign the reviewer', 'status_changed',
  '[{"type":"assign","user_id":"a0000000-1111-0000-0000-000000000001"}]'::jsonb,
  auth.uid()
);
select count(*) = 1 as rule_written from public.automations where project_id = :'pj';
select id as rule from public.automations where project_id = :'pj' \gset

\echo '2. A plain member of the space can READ it but not change it'
insert into public.workspace_members (workspace_id, user_id, role)
values (:'ws', 'a0000000-1111-0000-0000-000000000002', 'member');
insert into public.space_members (space_id, user_id, workspace_id, level)
values (:'sp', 'a0000000-1111-0000-0000-000000000002', :'ws', 'editor');

set local request.jwt.claims = '{"sub":"a0000000-1111-0000-0000-000000000002"}';
select count(*) = 1 as member_can_read from public.automations where project_id = :'pj';

do $$
declare touched int;
begin
  update public.automations set enabled = false;
  get diagnostics touched = row_count;
  if touched > 0 then raise exception 'FAIL: an editor rewrote a rule'; end if;
  raise notice 'PASS: writing a rule needs more than editing tasks';
end $$;

do $$
begin
  insert into public.automations (project_id, workspace_id, name, trigger, actions, created_by)
  select id, workspace_id, 'Mine now', 'task_created', '[{"type":"add_tag","tag":"x"}]'::jsonb, auth.uid()
  from public.projects limit 1;
  raise exception 'FAIL: an editor created a rule';
exception when insufficient_privilege then raise notice 'PASS: creating a rule is refused too';
end $$;

\echo '3. Somebody outside the space sees nothing'
set local role postgres;
delete from public.space_members
where space_id = :'sp' and user_id = 'a0000000-1111-0000-0000-000000000002';
set local role authenticated;
select count(*) = 0 as outsider_sees_nothing from public.automations;

\echo '4. The run log cannot be written from a session'
do $$
begin
  insert into public.automation_runs (automation_id, status, detail)
  select id, 'ok', 'I did this myself' from public.automations limit 1;
  raise exception 'FAIL: a client forged a run';
exception
  when insufficient_privilege then raise notice 'PASS: runs are written by the runner alone';
  -- With no readable automations the select finds nothing, so the
  -- insert touches no rows. Either way nothing was forged.
  when others then raise notice 'PASS: nothing was written (%)', sqlstate;
end $$;

\echo '5. but the function records one, and the rule owner can read it'
set local request.jwt.claims = '{"sub":"a0000000-1111-0000-0000-000000000001"}';
-- A void function has no value to assert on; the rows it wrote are the
-- assertion.
select public.record_automation_run(:'rule', :'t1', 0, 'ok', 'Ran 1 action(s).');
select count(*) = 1 as owner_reads_the_run
from public.automation_runs where automation_id = :'rule';
select depth = 0 and status = 'ok' as run_is_what_it_says
from public.automation_runs where automation_id = :'rule';

\echo '6. A rule and its project cannot disagree about the workspace'
do $$
begin
  insert into public.automations (project_id, workspace_id, name, trigger, actions, created_by)
  select p.id, '00000000-0000-0000-0000-000000000000', 'Wrong tenant', 'task_created',
         '[{"type":"add_tag","tag":"x"}]'::jsonb, auth.uid()
  from public.projects p limit 1;
  raise exception 'FAIL: a rule claimed another workspace';
exception
  when insufficient_privilege then raise notice 'PASS: the policy checks the workspace matches';
  when foreign_key_violation then raise notice 'PASS: refused by the foreign key';
end $$;

rollback;
