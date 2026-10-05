\set ON_ERROR_STOP on
\pset pager off

-- Points, and the four ways a scoring system usually dies:
--   · farming it with trivial work,
--   · paying twice for the same thing,
--   · keeping points for work that was undone,
--   · letting the people being measured rewrite the rules.

insert into auth.users (id, email, raw_user_meta_data) values
  ('b0000000-2222-0000-0000-000000000001', 'boss-score@example.com',  '{"full_name":"Boss"}'),
  ('b0000000-2222-0000-0000-000000000002', 'alice-score@example.com', '{"full_name":"Alice"}'),
  ('b0000000-2222-0000-0000-000000000003', 'bob-score@example.com',   '{"full_name":"Bob"}')
on conflict (id) do nothing;

begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"b0000000-2222-0000-0000-000000000001"}';

\echo '1. An admin turns scoring on, and gets rules that already make sense'
select id as ws from public.create_workspace('Points Co', 'points-co') \gset
select id as sp from public.create_space('Studio', 'studio') \gset
select id as pj from public.create_project(:'sp', 'Launch', 'launch', '', 'violet') \gset
select count(*) = 5 as default_rules from public.enable_scoring(:'pj');

insert into public.workspace_members (workspace_id, user_id, role) values
  (:'ws', 'b0000000-2222-0000-0000-000000000002', 'member'),
  (:'ws', 'b0000000-2222-0000-0000-000000000003', 'member');
insert into public.space_members (space_id, user_id, workspace_id, level) values
  (:'sp', 'b0000000-2222-0000-0000-000000000002', :'ws', 'editor'),
  (:'sp', 'b0000000-2222-0000-0000-000000000003', :'ws', 'editor');

\echo '2. A member cannot rewrite the rules they are measured by'
set local request.jwt.claims = '{"sub":"b0000000-2222-0000-0000-000000000002"}';
do $$
declare touched int;
begin
  update public.scoring_rules set points = 1000;
  get diagnostics touched = row_count;
  if touched > 0 then raise exception 'FAIL: a member rewrote the scoring rules'; end if;
  raise notice 'PASS: rules are the admin''s alone';
end $$;

\echo '3. Nor write themselves into the ledger'
do $$
begin
  insert into public.score_events (project_id, workspace_id, user_id, event, points)
  select p.id, p.workspace_id, auth.uid(), 'task_completed', 9999
  from public.projects p limit 1;
  raise exception 'FAIL: a member awarded themselves points';
exception when insufficient_privilege then raise notice 'PASS: the ledger is written by award_points alone';
end $$;

\echo '4. Effort counts, not volume: a day of work outscores ten small jobs'
set local role postgres;
select public.award_points(:'pj', 'b0000000-2222-0000-0000-000000000002',
  'task_completed', null, null, 'Big piece', 'big-1', 8) as big_task_points;
select sum(public.award_points(:'pj', 'b0000000-2222-0000-0000-000000000003',
  'task_completed', null, null, 'Tiny', 'tiny-' || n, 0.25))::integer as ten_tiny_tasks
from generate_series(1, 10) as n;

select
  (select coalesce(sum(points), 0) from public.score_events
    where user_id = 'b0000000-2222-0000-0000-000000000002') >
  (select coalesce(sum(points), 0) from public.score_events
    where user_id = 'b0000000-2222-0000-0000-000000000003')
  as one_real_task_beats_ten_trivial_ones;

\echo '5. The same completion does not pay twice'
select public.award_points(:'pj', 'b0000000-2222-0000-0000-000000000002',
  'task_completed', null, null, 'Big piece again', 'big-1', 8) = 0 as second_award_pays_nothing;

\echo '6. The daily ceiling holds'
-- The rule caps task_completed at 200/day; Bob is already near it.
select sum(public.award_points(:'pj', 'b0000000-2222-0000-0000-000000000003',
  'task_completed', null, null, 'Grinding', 'grind-' || n, 8))::integer as while_grinding
from generate_series(1, 40) as n;
select coalesce(sum(points), 0) <= 200 as capped
from public.score_events
where user_id = 'b0000000-2222-0000-0000-000000000003' and event = 'task_completed';

\echo '7. Reopening a task takes the points back, without erasing the record'
select public.revoke_points(:'pj', 'b0000000-2222-0000-0000-000000000002', 'big-1', 'Reopened') < 0
  as points_withdrawn;
select count(*) = 2 as both_rows_kept
from public.score_events
where user_id = 'b0000000-2222-0000-0000-000000000002' and task_id is null
  and dedupe_key in ('big-1', '-big-1');
select coalesce(sum(points), 0) = 0 as net_is_zero
from public.score_events
where user_id = 'b0000000-2222-0000-0000-000000000002' and dedupe_key in ('big-1', '-big-1');

\echo '8. Kudos: a budget, and never to yourself'
set local role authenticated;
set local request.jwt.claims = '{"sub":"b0000000-2222-0000-0000-000000000002"}';
select public.kudos_remaining(:'pj') = 5 as starts_with_five;
select public.give_kudos(:'pj', 'b0000000-2222-0000-0000-000000000003', 'Saved me an hour') > 0
  as kudos_paid;
select public.kudos_remaining(:'pj') = 4 as budget_spent;

do $$
begin
  perform public.give_kudos(
    (select id from public.projects limit 1), auth.uid(), 'I am great');
  raise exception 'FAIL: thanked themselves';
exception when sqlstate 'P0001' then raise notice 'PASS: %', sqlerrm;
end $$;

\echo '9. and the budget actually runs out'
select public.give_kudos(:'pj', 'b0000000-2222-0000-0000-000000000003', '2') >= 0 as gave_2;
select public.give_kudos(:'pj', 'b0000000-2222-0000-0000-000000000003', '3') >= 0 as gave_3;
select public.give_kudos(:'pj', 'b0000000-2222-0000-0000-000000000003', '4') >= 0 as gave_4;
select public.give_kudos(:'pj', 'b0000000-2222-0000-0000-000000000003', '5') >= 0 as gave_5;
do $$
begin
  perform public.give_kudos(
    (select id from public.projects limit 1),
    'b0000000-2222-0000-0000-000000000003', 'one too many');
  raise exception 'FAIL: gave a sixth kudos in a week';
exception when sqlstate 'P0001' then raise notice 'PASS: %', sqlerrm;
end $$;

\echo '10. The leaderboard shows the team, and only to the team'
select count(*) >= 2 as everybody_who_earned_is_listed
from public.project_leaderboard(:'pj');

set local role postgres;
delete from public.space_members
where space_id = :'sp' and user_id = 'b0000000-2222-0000-0000-000000000002';
set local role authenticated;
select count(*) = 0 as outsider_sees_no_standings from public.project_leaderboard(:'pj');
select count(*) = 0 as outsider_sees_no_ledger from public.score_events;

rollback;
