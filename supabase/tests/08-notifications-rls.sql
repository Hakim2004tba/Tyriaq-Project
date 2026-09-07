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

\echo '1. Alice sets up a workspace and adds Bob — which tells him'
select id as ws from public.create_workspace('Notify Co', 'notify-co') \gset
insert into public.workspace_members (workspace_id, user_id, role)
values (:'ws', '22222222-2222-2222-2222-222222222222', 'member');
-- Read as Bob: a notification addressed to somebody else is invisible,
-- which is the point — so every check here looks from the recipient.
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select kind::text, title from public.notifications;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

\echo '2. adding herself as owner did NOT notify her — no self-notifications'
select count(*) as notifications_for_alice
from public.notifications where user_id = '11111111-1111-1111-1111-111111111111';

\echo '3. assigning Bob a task tells him, with the task attached'
insert into public.spaces (workspace_id, name, slug, created_by)
values (:'ws', 'Product', 'product', auth.uid());
select id as sp from public.spaces where slug = 'product' \gset
select id as pj from public.create_project(:'sp', 'Website', 'website', '', 'violet') \gset
select id as t1 from public.create_task(:'pj', 'Design the hero') \gset
insert into public.task_assignees (task_id, user_id, workspace_id)
values (:'t1', '22222222-2222-2222-2222-222222222222', :'ws');
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select kind::text, title, body, (task_id is not null) as links_to_the_task
from public.notifications where kind = 'task_assigned';
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

\echo '4. moving it tells the assignee; completing it says so differently'
update public.tasks set status = 'in_progress' where id = :'t1';
update public.tasks set status = 'done' where id = :'t1';
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select kind::text, title from public.notifications
where kind in ('task_status', 'task_completed') order by created_at;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

\echo '5. a comment mention reaches the person named, and nobody else'
insert into public.task_comments (task_id, workspace_id, author_id, body, mentions)
values (:'t1', :'ws', auth.uid(), 'Can you take a look @Bob?',
        array['22222222-2222-2222-2222-222222222222']::uuid[]);
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select count(*) as mention_notifications, count(distinct user_id) as recipients
from public.notifications where kind = 'comment_mention';
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

\echo '6. the due-date sweep is idempotent — twice is still once per day'
update public.tasks set status = 'todo', due_date = current_date - 2 where id = :'t1';
select public.sweep_due_notifications() as first_run;
select public.sweep_due_notifications() as second_run;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select kind::text, count(*) as rows from public.notifications
where kind in ('due_soon', 'task_overdue') group by kind;

\echo '7. Bob reads his own, and only his own'
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select count(*) as visible_to_bob,
       count(*) filter (where user_id <> auth.uid()) as belonging_to_others
from public.notifications;

\echo '8. he marks one read; the unread count drops'
update public.notifications set read_at = now()
where user_id = auth.uid() and kind = 'task_assigned';
select count(*) filter (where read_at is null) as unread from public.notifications;

\echo '9. he cannot mark Alice''s as read, nor invent one for her'
do $$
declare touched int;
begin
  update public.notifications set read_at = now()
  where user_id = '11111111-1111-1111-1111-111111111111';
  get diagnostics touched = row_count;
  if touched > 0 then raise exception 'FAIL: marked % of hers read', touched; end if;
  raise notice 'PASS: her notifications are hers';
end $$;
do $$
begin
  insert into public.notifications (user_id, workspace_id, kind, title)
  values ('11111111-1111-1111-1111-111111111111',
          (select workspace_id from public.workspace_members limit 1),
          'task_assigned', 'you have been fired');
  raise exception 'FAIL: forged a notification';
exception when insufficient_privilege then raise notice 'PASS: no insert policy — triggers only';
end $$;

\echo '10. muting a kind stops it arriving — measured as a delta'
do $$
declare before_count int; after_count int; ws uuid;
begin
  select workspace_id into ws from public.workspace_members where user_id = auth.uid() limit 1;
  select count(*) into before_count from public.notifications where kind = 'task_status';

  insert into public.notification_preferences (user_id, workspace_id, muted_kinds)
  values (auth.uid(), ws, array['task_status']::public.notification_kind[]);

  -- Alice moves it again; nothing should arrive this time.
  perform set_config('request.jwt.claims',
                     '{"sub":"11111111-1111-1111-1111-111111111111"}', true);
  update public.tasks set status = 'review' where title = 'Design the hero';
  perform set_config('request.jwt.claims',
                     '{"sub":"22222222-2222-2222-2222-222222222222"}', true);

  select count(*) into after_count from public.notifications where kind = 'task_status';
  if after_count <> before_count then
    raise exception 'FAIL: a muted kind still arrived (% -> %)', before_count, after_count;
  end if;
  raise notice 'PASS: muted, and nothing arrived (still % )', after_count;
end $$;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

\echo '11. a message notifies the other participant, and a mention wins over it'
select id as dm from public.open_direct_message('22222222-2222-2222-2222-222222222222') \gset
insert into public.messages (conversation_id, workspace_id, author_id, body, mentions)
values (:'dm', :'dm', auth.uid(), 'morning', '{}'::uuid[]);
insert into public.messages (conversation_id, workspace_id, author_id, body, mentions)
values (:'dm', :'dm', auth.uid(), 'and @Bob one more thing',
        array['22222222-2222-2222-2222-222222222222']::uuid[]);
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select kind::text, count(*) as rows from public.notifications
where conversation_id is not null group by kind order by kind;

\echo '12. Carla, in no shared workspace, receives and sees nothing'
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';
select count(*) as visible_to_carla from public.notifications;

\echo '13. a notification about a deleted task disappears with it'
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select count(*) as before_delete from public.notifications where task_id = :'t1';
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
delete from public.tasks where id = :'t1';
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select count(*) as after_delete from public.notifications where task_id = :'t1';

rollback;
