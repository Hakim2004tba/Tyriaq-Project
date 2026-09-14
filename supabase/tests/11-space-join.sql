\set ON_ERROR_STOP on
\pset pager off

-- Joining a space by link: minting, asking, approving, declining, and
-- changing somebody's project access afterwards.
--
-- Every assertion below is one that shipped broken at least once. Three
-- of them were enum casts that only fail at run time, which is exactly
-- what executing the flow catches and reading it does not.

insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'owner@example.com',    '{"full_name":"Owner Person"}'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'stranger@example.com', '{"full_name":"Stranger Person"}'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'second@example.com',   '{"full_name":"Second Person"}')
on conflict (id) do nothing;

begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000001"}';

\echo '1. An owner sets up a space with one project'
select id as ws from public.create_workspace('Join Co', 'join-co') \gset
insert into public.spaces (workspace_id, name, slug, created_by)
values (:'ws', 'Studio', 'studio', auth.uid());
select id as sp from public.spaces where slug = 'studio' \gset
select id as pj from public.create_project(:'sp', 'Launch', 'launch', '', 'violet') \gset
insert into public.space_members (space_id, user_id, workspace_id, level)
values (:'sp', auth.uid(), :'ws', 'admin');

\echo '2. They mint a link, and there can only be one live at a time'
insert into public.space_invite_links (space_id, workspace_id, created_by)
values (:'sp', :'ws', auth.uid());
select token as link from public.space_invite_links where space_id = :'sp' \gset
select count(*) = 1 as one_live_link from public.space_invite_links where revoked_at is null;

\echo '3. A stranger, who cannot read the links table, can still read the preview'
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000002"}';
select count(*) = 0 as link_row_hidden from public.space_invite_links;
select space_name = 'Studio' and not already_member and not pending_request as preview_reads
from public.space_link_preview(:'link');

\echo '4. They ask, and asking twice is not an error'
select (public.request_space_join(:'link', 'I am the new designer')).status = 'pending' as asked;
select (public.request_space_join(:'link', 'again')).status = 'pending' as asked_twice_is_fine;
select count(*) = 1 as only_one_request from public.space_join_requests where user_id = auth.uid();

\echo '5. A stranger cannot approve their own request'
select public.can_manage_space(:'sp') = false as stranger_cannot_manage;

\echo '6. The owner approves: editor in the space, viewer on the one project'
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000001"}';
select id as req from public.space_join_requests where status = 'pending' \gset
select (public.decide_space_join(:'req', true, 'editor',
          jsonb_build_object(:'pj', 'viewer'))).status = 'approved' as approved;

set local role postgres;
select
  (select role::text from public.workspace_members
    where user_id = 'aaaaaaaa-0000-0000-0000-000000000002' and workspace_id = :'ws') = 'member'
    as joined_the_workspace,
  (select level::text from public.space_members
    where user_id = 'aaaaaaaa-0000-0000-0000-000000000002' and space_id = :'sp') = 'editor'
    as space_level_granted,
  (select level::text from public.project_members
    where user_id = 'aaaaaaaa-0000-0000-0000-000000000002' and project_id = :'pj') = 'viewer'
    as project_override_granted,
  public.project_level(:'pj', 'aaaaaaaa-0000-0000-0000-000000000002') = 'viewer'
    as project_beats_space,
  (select count(*) = 1 from public.notifications
    where user_id = 'aaaaaaaa-0000-0000-0000-000000000002' and kind = 'space_join_approved')
    as they_were_told;

\echo '7. Clearing the override puts them back to inheriting the space'
set local role authenticated;
select public.set_project_level(:'pj', 'aaaaaaaa-0000-0000-0000-000000000002', null);
select public.project_level(:'pj', 'aaaaaaaa-0000-0000-0000-000000000002') = 'editor'
  as inherits_again;

\echo '8. A second request can be declined, and declining lets them ask again'
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000003"}';
select (public.request_space_join(:'link', '')).status = 'pending' as second_person_asked;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000001"}';
select id as req2 from public.space_join_requests
  where user_id = 'aaaaaaaa-0000-0000-0000-000000000003' and status = 'pending' \gset
select (public.decide_space_join(:'req2', false)).status = 'declined' as declined;

set local role postgres;
select count(*) = 0 as declined_person_not_added
from public.space_members
where space_id = :'sp' and user_id = 'aaaaaaaa-0000-0000-0000-000000000003';

set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000003"}';
select (public.request_space_join(:'link', 'asking again')).status = 'pending'
  as a_no_is_not_permanent;

\echo '9. A revoked link stops working'
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000001"}';
update public.space_invite_links set revoked_at = now() where token = :'link';
select is_revoked as preview_says_revoked from public.space_link_preview(:'link');

rollback;
