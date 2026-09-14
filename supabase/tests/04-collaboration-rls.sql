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

\echo '1. Alice sets up a workspace with Bob in it, and a task'
select id as ws from public.create_workspace('Collab Co', 'collab-co') \gset
insert into public.workspace_members (workspace_id, user_id, role)
values (:'ws', '22222222-2222-2222-2222-222222222222', 'member');
insert into public.spaces (workspace_id, name, slug, created_by)
values (:'ws', 'Product', 'product', auth.uid());
select id as sp from public.spaces where slug = 'product' \gset

/*
  Bob is put in the SPACE, not only the workspace.

  Workspace membership stopped implying visibility when spaces became a
  boundary — see 12-space-isolation. Without this, Bob can see none of
  Alice's work, and the assertions below stop testing what they were
  written to test: that a colleague who CAN see the work still cannot
  act under somebody else's name.
*/
insert into public.space_members (space_id, user_id, workspace_id, level)
values (:'sp', '22222222-2222-2222-2222-222222222222', :'ws', 'editor');

select id as pj from public.create_project(:'sp', 'Website', 'website', '', 'violet') \gset
select id as t1 from public.create_task(:'pj', 'Design the hero') \gset

\echo '2. creating the task already wrote its own history'
select kind::text, text from public.task_activity where task_id = :'t1';

\echo '3. a comment mentioning Bob keeps him; a mention of an outsider is dropped'
insert into public.task_comments (task_id, workspace_id, author_id, body, mentions)
values (:'t1', :'ws', auth.uid(), 'First pass is up @Bob @Carla',
        array['22222222-2222-2222-2222-222222222222',
              '33333333-3333-3333-3333-333333333333']::uuid[]);
select array_length(mentions, 1) as kept_mentions,
       mentions[1] = '22222222-2222-2222-2222-222222222222' as kept_the_member
from public.task_comments;

\echo '4. the comment logged itself to the activity feed'
select count(*) as commented_entries from public.task_activity
where task_id = :'t1' and kind = 'commented';

\echo '5. status, priority and due date changes are recorded without the app asking'
update public.tasks set status = 'in_progress' where id = :'t1';
update public.tasks set priority = 'urgent' where id = :'t1';
update public.tasks set due_date = current_date + 5 where id = :'t1';
select kind::text, text from public.task_activity
where task_id = :'t1' and kind in ('status', 'due') order by created_at;

\echo '6. assignment reads differently for yourself and for someone else'
insert into public.task_assignees (task_id, user_id, workspace_id)
values (:'t1', '11111111-1111-1111-1111-111111111111', :'ws');
insert into public.task_assignees (task_id, user_id, workspace_id)
values (:'t1', '22222222-2222-2222-2222-222222222222', :'ws');
select text from public.task_activity where kind = 'assigned' order by created_at;

\echo '7. an attachment must be stored under its own workspace and task'
insert into public.task_attachments (task_id, workspace_id, uploaded_by, storage_path, file_name, mime_type, size_bytes)
values (:'t1', :'ws', auth.uid(), :'ws' || '/' || :'t1' || '/aa.pdf', 'brief.pdf', 'application/pdf', 12000);
do $$
declare t uuid; w uuid;
begin
  select id, workspace_id into t, w from public.tasks limit 1;
  insert into public.task_attachments (task_id, workspace_id, uploaded_by, storage_path, file_name)
  values (t, w, auth.uid(), 'somebody-elses-workspace/' || t || '/x.pdf', 'x.pdf');
  raise exception 'FAIL: attachment escaped its workspace prefix';
exception when sqlstate 'P0001' then raise notice 'PASS: %', sqlerrm;
end $$;

\echo '8. nobody can write the activity feed by hand — not even about their own task'
do $$
declare t uuid; w uuid;
begin
  select id, workspace_id into t, w from public.tasks limit 1;
  insert into public.task_activity (task_id, workspace_id, kind, text)
  values (t, w, 'status', 'did something that never happened');
  raise exception 'FAIL: activity feed accepted a hand-written entry';
exception when insufficient_privilege then raise notice 'PASS: no insert policy on task_activity';
end $$;

\echo '9. and it cannot be pruned either'
do $$
declare removed int;
begin
  delete from public.task_activity;
  get diagnostics removed = row_count;
  if removed > 0 then raise exception 'FAIL: % history rows deleted', removed; end if;
  raise notice 'PASS: history is not deletable through the API';
end $$;

\echo '10. Bob sees the discussion, and may add to it'
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select (select count(*) from public.task_comments) as comments_visible,
       (select count(*) from public.task_attachments) as files_visible,
       (select count(*) > 0 from public.task_activity) as history_visible;
insert into public.task_comments (task_id, workspace_id, author_id, body)
values (:'t1', :'ws', auth.uid(), 'Looks good to me');

\echo '11. but he cannot rewrite what Alice said'
do $$
declare changed int;
begin
  update public.task_comments set body = 'I never wrote this'
  where author_id = '11111111-1111-1111-1111-111111111111';
  get diagnostics changed = row_count;
  if changed > 0 then raise exception 'FAIL: % of her comments rewritten', changed; end if;
  raise notice 'PASS: her comment is not his to edit';
end $$;

\echo '12. nor delete it — he is a member, not an admin'
do $$
declare removed int;
begin
  delete from public.task_comments where author_id = '11111111-1111-1111-1111-111111111111';
  get diagnostics removed = row_count;
  if removed > 0 then raise exception 'FAIL: % of her comments deleted', removed; end if;
  raise notice 'PASS: her comment survives';
end $$;

\echo '13. he can edit and delete his own'
update public.task_comments set body = 'Looks good to me, shipping', edited_at = now()
where author_id = auth.uid();
select body, (edited_at is not null) as marked_edited from public.task_comments where author_id = auth.uid();
delete from public.task_comments where author_id = auth.uid();
select count(*) as his_comments_left from public.task_comments where author_id = auth.uid();

\echo '14. an outsider sees no comments, no files and no history'
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';
select (select count(*) from public.task_comments) as comments_visible,
       (select count(*) from public.task_attachments) as files_visible,
       (select count(*) from public.task_activity) as history_visible;

\echo '15. and cannot comment on a task whose id she happens to know'
do $$
begin
  insert into public.task_comments (task_id, workspace_id, author_id, body)
  select t.id, t.workspace_id, auth.uid(), 'let me in'
  from public.tasks t limit 1;
  if not found then raise notice 'PASS: the task is not even visible to her'; return; end if;
  raise exception 'FAIL: outsider commented';
exception when insufficient_privilege then raise notice 'PASS: policy refused the write';
end $$;

\echo '16. storage: a member may write only under their own workspace prefix'
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
insert into storage.objects (bucket_id, name, owner)
values ('task-files', :'ws' || '/' || :'t1' || '/bb.pdf', auth.uid());
do $$
begin
  insert into storage.objects (bucket_id, name, owner)
  values ('task-files', '99999999-9999-9999-9999-999999999999/x/y.pdf', auth.uid());
  raise exception 'FAIL: wrote into another workspace''s prefix';
exception when insufficient_privilege then raise notice 'PASS: storage policy refused the write';
end $$;

\echo '17. the outsider can neither read nor delete those objects'
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';
select count(*) as objects_visible from storage.objects;
do $$
declare removed int;
begin
  delete from storage.objects;
  get diagnostics removed = row_count;
  if removed > 0 then raise exception 'FAIL: % objects deleted', removed; end if;
  raise notice 'PASS: files are not hers to delete';
end $$;

\echo '18. the workspace owner may remove a file somebody else uploaded'
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
do $$
declare removed int;
begin
  delete from storage.objects where name like '%bb.pdf';
  get diagnostics removed = row_count;
  if removed <> 1 then raise exception 'FAIL: admin could not moderate (% rows)', removed; end if;
  raise notice 'PASS: admin removed it';
end $$;

\echo '19. realtime broadcasts collaboration, and leaves tasks alone'
select tablename from pg_publication_tables
where pubname = 'supabase_realtime' order by tablename;

rollback;
