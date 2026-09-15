\set ON_ERROR_STOP on
\pset pager off

-- Plans, limits, and the two things nobody may do from a browser.

insert into auth.users (id, email, raw_user_meta_data) values
  ('dddddddd-0000-0000-0000-000000000001', 'payer@example.com', '{"full_name":"Payer"}'),
  ('dddddddd-0000-0000-0000-000000000002', 'staff@example.com', '{"full_name":"Staff"}')
on conflict (id) do nothing;

begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"dddddddd-0000-0000-0000-000000000001"}';

\echo '1. A new workspace is on Free without any subscription row'
select id as ws from public.create_workspace('Paying Co', 'paying-co') \gset
select count(*) = 0 as no_subscription_row
from public.workspace_subscriptions where workspace_id = :'ws';
select name = 'Free' as defaults_to_free from public.workspace_plan(:'ws');

\echo '2. Free allows two projects'
insert into public.spaces (workspace_id, name, slug, created_by)
values (:'ws', 'Studio', 'studio', auth.uid());
select id as sp from public.spaces where slug = 'studio' \gset
select id as p1 from public.create_project(:'sp', 'One', 'one', '', 'violet') \gset
select allowed as second_project_allowed from public.plan_allows(:'ws', 'project');
select id as p2 from public.create_project(:'sp', 'Two', 'two', '', 'blue') \gset

\echo '3. and refuses the third, with a sentence somebody can act on'
select allowed as third_project_allowed, reason
from public.plan_allows(:'ws', 'project');

\echo '4. Members are capped the same way'
select used, allowance from public.plan_allows(:'ws', 'member');

\echo '5. Pressing Upgrade records an intention — it does not grant the plan'
select (public.request_plan(:'ws', 'pro', 'we need more seats')).kind as event_kind;
select name = 'Free' as still_on_free from public.workspace_plan(:'ws');
select count(*) = 1 as one_event_recorded
from public.billing_events where workspace_id = :'ws' and kind = 'requested';

\echo '6. A member cannot request a plan at all'
insert into public.workspace_members (workspace_id, user_id, role)
values (:'ws', 'dddddddd-0000-0000-0000-000000000002', 'member');
set local request.jwt.claims = '{"sub":"dddddddd-0000-0000-0000-000000000002"}';
do $$
begin
  perform public.request_plan(
    (select id from public.workspaces where slug = 'paying-co'), 'pro', '');
  raise exception 'FAIL: a member changed the plan';
exception when sqlstate 'P0001' then raise notice 'PASS: %', sqlerrm;
end $$;

\echo '7. Nobody can write a subscription row directly'
do $$
begin
  insert into public.workspace_subscriptions (workspace_id, plan_id)
  values ((select id from public.workspaces where slug = 'paying-co'), 'enterprise');
  raise exception 'FAIL: a browser granted itself Enterprise';
exception when insufficient_privilege then raise notice 'PASS: subscriptions are not writable from a session';
end $$;

\echo '8. Confirming a payment does move the plan, and lifts the limit'
set local role postgres;
select (public.set_workspace_plan(:'ws', 'team', 'active', 10)).status as subscription_status;
set local role authenticated;
set local request.jwt.claims = '{"sub":"dddddddd-0000-0000-0000-000000000001"}';
select name = 'Team' as now_on_team from public.workspace_plan(:'ws');
select allowed as projects_now_unlimited from public.plan_allows(:'ws', 'project');

\echo '9. A cancelled subscription falls back to Free'
set local role postgres;
-- `.status`, not `IS NOT NULL`: a composite is "not null" only when
-- every field is, and a cancelled row has nulls in it by design.
select (public.set_workspace_plan(:'ws', 'team', 'cancelled', 10)).status = 'cancelled' as cancelled;
set local role authenticated;
select name = 'Free' as back_to_free from public.workspace_plan(:'ws');

rollback;
