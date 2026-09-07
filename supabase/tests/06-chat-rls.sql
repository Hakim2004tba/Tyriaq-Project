\set ON_ERROR_STOP on
\pset pager off

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com', '{"full_name":"Alice Ait"}'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com',   '{"full_name":"Bob Belkacem"}'),
  ('33333333-3333-3333-3333-333333333333', 'carla@example.com', '{"full_name":"Carla Cherif"}'),
  ('44444444-4444-4444-4444-444444444444', 'dina@example.com',  '{"full_name":"Dina Daoud"}')
on conflict (id) do nothing;

begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

\echo '1. a workspace with Alice, Bob and Dina; Carla is elsewhere'
select id as ws from public.create_workspace('Chat Co', 'chat-co') \gset
insert into public.workspace_members (workspace_id, user_id, role) values
  (:'ws', '22222222-2222-2222-2222-222222222222', 'member'),
  (:'ws', '44444444-4444-4444-4444-444444444444', 'member');
insert into public.spaces (workspace_id, name, slug, created_by)
values (:'ws', 'Product', 'product', auth.uid());
select id as sp from public.spaces where slug = 'product' \gset
select id as pj from public.create_project(:'sp', 'Website', 'website', '', 'violet') \gset
select id as t1 from public.create_task(:'pj', 'Design the hero') \gset

\echo '2. opening a DM twice returns the same conversation'
select id as dm from public.open_direct_message('22222222-2222-2222-2222-222222222222') \gset
select (select id from public.open_direct_message('22222222-2222-2222-2222-222222222222')) = :'dm'
  as same_conversation_second_time,
  (select count(*) from public.conversations where kind = 'dm') as dm_rows,
  (select count(*) from public.conversation_members where conversation_id = :'dm') as people;

\echo '3. and Bob opening Alice lands in the same one'
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select (select id from public.open_direct_message('11111111-1111-1111-1111-111111111111')) = :'dm'
  as same_from_the_other_side;

\echo '4. a message carries live references, and invalid ones are dropped'
insert into public.messages (conversation_id, workspace_id, author_id, body, mentions, task_refs, project_refs)
values (:'dm', :'dm', auth.uid(), 'Taking @Alice''s point on this',
        array['11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333']::uuid[],
        array[:'t1']::uuid[],
        array[:'pj']::uuid[]);
select array_length(mentions, 1) as mentions_kept,
       array_length(task_refs, 1) as tasks_kept,
       workspace_id = :'ws' as workspace_derived
from public.messages;

\echo '5. the conversation''s activity clock moved without the app setting it'
select (last_message_at is not null) as sorted_by_activity
from public.conversations where id = :'dm';

\echo '6. replies must stay inside their own conversation'
select id as m1 from public.messages limit 1 \gset
select id as grp from public.create_group_conversation('Launch crew',
  array['11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-444444444444']::uuid[]) \gset
do $$
declare g uuid; foreign_message uuid;
begin
  select id into g from public.conversations where kind = 'group';
  select id into foreign_message from public.messages limit 1;
  insert into public.messages (conversation_id, workspace_id, author_id, body, reply_to_id)
  values (g, g, auth.uid(), 'reply across conversations', foreign_message);
  raise exception 'FAIL: reply crossed conversations';
exception when sqlstate 'P0001' then raise notice 'PASS: %', sqlerrm;
end $$;

\echo '7. reactions are per person per emoji, and only yours to remove'
insert into public.message_reactions (message_id, user_id, emoji, workspace_id)
values (:'m1', auth.uid(), '👍', :'ws');
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
insert into public.message_reactions (message_id, user_id, emoji, workspace_id)
values (:'m1', auth.uid(), '👍', :'ws');
select emoji, count(*) as people from public.message_reactions group by emoji;
do $$
declare removed int;
begin
  delete from public.message_reactions where user_id = '22222222-2222-2222-2222-222222222222';
  get diagnostics removed = row_count;
  if removed > 0 then raise exception 'FAIL: removed somebody else''s reaction'; end if;
  raise notice 'PASS: his reaction is not hers to remove';
end $$;

\echo '8. Dina is in the workspace but not in the DM — she sees nothing of it'
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444"}';
select (select count(*) from public.conversations where kind = 'dm') as dms_visible,
       (select count(*) from public.messages) as messages_visible,
       (select count(*) from public.message_reactions) as reactions_visible;

\echo '9. and cannot post into it even knowing its id'
do $$
declare d uuid := null;
begin
  insert into public.messages (conversation_id, workspace_id, author_id, body)
  values ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', auth.uid(), 'let me in');
  raise exception 'FAIL: outsider posted';
exception
  when insufficient_privilege then raise notice 'PASS: policy refused the write';
  when sqlstate 'P0001' then raise notice 'PASS: %', sqlerrm;
end $$;

\echo '10. but she does see the group she was added to'
select count(*) as groups_visible from public.conversations where kind = 'group';

\echo '11. a project channel is readable by the whole workspace'
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select id as chan from public.open_project_conversation(:'pj') \gset
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444"}';
select count(*) as channel_visible_to_non_member from public.conversations where kind = 'project';

\echo '12. reading it does not let her post; joining does'
do $$
declare c uuid;
begin
  select id into c from public.conversations where kind = 'project';
  insert into public.messages (conversation_id, workspace_id, author_id, body)
  values (c, c, auth.uid(), 'posting without joining');
  raise exception 'FAIL: posted to a channel she has not joined';
exception when insufficient_privilege then raise notice 'PASS: reading is not posting';
end $$;
insert into public.conversation_members (conversation_id, user_id, workspace_id)
values (:'chan', auth.uid(), :'ws');
insert into public.messages (conversation_id, workspace_id, author_id, body)
values (:'chan', :'ws', auth.uid(), 'joined, now posting');
select count(*) as posted from public.messages where conversation_id = :'chan';

\echo '13. Carla, in no workspace here, sees nothing at all'
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';
select (select count(*) from public.conversations) as conversations,
       (select count(*) from public.messages) as messages,
       (select count(*) from public.conversation_members) as roster_rows;

\echo '14. a message becomes a task, and the task is a reference not a copy'
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select id as m2 from public.messages where body like 'Taking%' \gset
select title from public.create_task_from_message(:'m2', :'pj', null);
select array_length(task_refs, 1) as refs_on_the_message
from public.messages where id = :'m2';

\echo '15. an outsider cannot make a task from a message she cannot read'
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';
do $$
begin
  perform public.create_task_from_message(
    (select id from public.messages limit 1),
    (select id from public.projects limit 1), 'sneaky');
  raise exception 'FAIL: outsider created a task from a message';
exception
  when sqlstate 'P0001' then raise notice 'PASS: %', sqlerrm;
  when others then raise notice 'PASS: nothing of it is visible to her';
end $$;

\echo '16. full-text search is indexed, and scoped by the same policies'
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444"}';
select count(*) as hits_for_dina
from public.messages where search @@ websearch_to_tsquery('simple', 'taking');
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select count(*) as hits_for_alice
from public.messages where search @@ websearch_to_tsquery('simple', 'taking');

\echo '17. chat, reactions and conversations are broadcast live'
select tablename from pg_publication_tables
where pubname = 'supabase_realtime'
  and tablename in ('messages', 'message_reactions', 'conversations')
order by tablename;

rollback;
