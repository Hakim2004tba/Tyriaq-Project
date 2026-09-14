\set ON_ERROR_STOP on
\pset pager off

-- A space is a boundary.
--
-- The bug this exists to prevent: somebody accepted a link to ONE space
-- and could then read every other space in that workspace, because
-- visibility was "are you in this workspace" and nothing narrower.

insert into auth.users (id, email, raw_user_meta_data) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'boss@example.com',  '{"full_name":"Boss"}'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'guest@example.com', '{"full_name":"Guest"}')
on conflict (id) do nothing;

begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"bbbbbbbb-0000-0000-0000-000000000001"}';

\echo '1. One workspace, two spaces, a project in each'
select id as ws from public.create_workspace('Two Spaces', 'two-spaces') \gset
insert into public.spaces (workspace_id, name, slug, created_by)
values (:'ws', 'Shared', 'shared', auth.uid()), (:'ws', 'Private', 'private', auth.uid());
select id as shared from public.spaces where slug = 'shared' \gset
select id as secret from public.spaces where slug = 'private' \gset
select id as pj_shared from public.create_project(:'shared', 'Open work', 'open-work', '', 'violet') \gset
select id as pj_secret from public.create_project(:'secret', 'Quiet work', 'quiet-work', '', 'blue') \gset
select id as t_secret from public.create_task(:'pj_secret', 'Not for guests') \gset
select id as t_shared from public.create_task(:'pj_shared', 'Fine to see') \gset
insert into public.task_comments (task_id, workspace_id, author_id, body)
values (:'t_secret', :'ws', auth.uid(), 'private conversation');

\echo '2. The guest joins the workspace and ONE space'
insert into public.workspace_members (workspace_id, user_id, role)
values (:'ws', 'bbbbbbbb-0000-0000-0000-000000000002', 'member');
insert into public.space_members (space_id, user_id, workspace_id, level)
values (:'shared', 'bbbbbbbb-0000-0000-0000-000000000002', :'ws', 'editor');

\echo '3. They see that space and nothing else'
set local request.jwt.claims = '{"sub":"bbbbbbbb-0000-0000-0000-000000000002"}';
select count(*) = 1 as sees_only_one_space from public.spaces;
select count(*) = 1 as sees_only_one_project from public.projects;
select count(*) = 1 as sees_only_one_task from public.tasks;
select count(*) = 0 as sees_no_private_comments from public.task_comments;

\echo '4. Naming the private ids directly does not help'
select count(*) = 0 as private_space_by_id from public.spaces where id = :'secret';
select count(*) = 0 as private_project_by_id from public.projects where id = :'pj_secret';
select count(*) = 0 as private_task_by_id from public.tasks where id = :'t_secret';
select public.can_see_space(:'secret') = false as cannot_see_private_space;
select public.can_see_task(:'t_secret') = false as cannot_see_private_task;

\echo '5. Nor does writing into it'
-- The insert policy asks the same question, so this is refused outright
-- rather than writing a row nobody could then read. ON_ERROR_STOP is
-- lifted for exactly one statement: the refusal IS the assertion.
\set ON_ERROR_STOP off
savepoint before_sneaking;
insert into public.tasks (project_id, workspace_id, title, created_by)
values (:'pj_secret', :'ws', 'sneaked in', auth.uid());
rollback to savepoint before_sneaking;
\set ON_ERROR_STOP on

set local role postgres;
select count(*) = 0 as nothing_was_written
from public.tasks where title = 'sneaked in';
set local role authenticated;
set local request.jwt.claims = '{"sub":"bbbbbbbb-0000-0000-0000-000000000002"}';

\echo '6. A project grant alone is enough, without the space'
set local request.jwt.claims = '{"sub":"bbbbbbbb-0000-0000-0000-000000000001"}';
insert into public.project_members (project_id, user_id, role, level)
values (:'pj_secret', 'bbbbbbbb-0000-0000-0000-000000000002', 'viewer', 'viewer');
set local request.jwt.claims = '{"sub":"bbbbbbbb-0000-0000-0000-000000000002"}';
select public.can_see_project(:'pj_secret') as project_grant_is_enough;
select count(*) = 0 as but_still_not_the_space from public.spaces where id = :'secret';

\echo '7. The owner still sees everything'
set local request.jwt.claims = '{"sub":"bbbbbbbb-0000-0000-0000-000000000001"}';
select count(*) = 2 as owner_sees_both_spaces from public.spaces;
select count(*) = 2 as owner_sees_both_projects from public.projects;

rollback;
