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

\echo '1. Alice creates a workspace and invites Bob by email'
select id as ws from public.create_workspace('Invite Co', 'invite-co') \gset
insert into public.workspace_invitations (workspace_id, email, role, invited_by)
values (:'ws', '  BOB@Example.com  ', 'member', auth.uid());
select email as normalised, role::text, (token is not null) as has_token,
       (expires_at > now()) as still_valid
from public.workspace_invitations;
select token as tok from public.workspace_invitations \gset

\echo '2. the link says who it is for, without exposing the table'
select workspace_name, invited_email, invited_role::text, inviter_name, is_expired, is_accepted
from public.invitation_preview(:'tok');

\echo '3. re-inviting the same address does not create a second live row'
do $$
begin
  insert into public.workspace_invitations (workspace_id, email, role, invited_by)
  select workspace_id, 'bob@example.com', 'member', auth.uid()
  from public.workspace_invitations limit 1;
  raise exception 'FAIL: a duplicate pending invitation was created';
exception when unique_violation then raise notice 'PASS: one live invitation per address';
end $$;

\echo '4. Carla cannot accept an invitation addressed to Bob, even holding the token'
-- psql does not interpolate :'vars' inside a dollar-quoted body, so the
-- token is handed to the block through a session setting instead. She
-- gets the REAL token: the point is that possession is not enough.
select set_config('tyriaq.test_token', :'tok', false);
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';
select count(*) as invitations_visible_to_her from public.workspace_invitations;
do $$
begin
  perform public.accept_invitation(current_setting('tyriaq.test_token'));
  raise exception 'FAIL: she joined on somebody else''s invitation';
exception when sqlstate 'P0001' then raise notice 'PASS: %', sqlerrm;
end $$;

\echo '5. and holding the token itself is not enough'
do $$
begin
  perform public.accept_invitation('deadbeef-not-a-real-token');
  raise exception 'FAIL: a made-up token was accepted';
exception when sqlstate 'P0001' then raise notice 'PASS: %', sqlerrm;
end $$;

\echo '6. Bob accepts, and is a member with the invited role'
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select name from public.accept_invitation(:'tok');
select role::text as bobs_role from public.workspace_members
where user_id = '22222222-2222-2222-2222-222222222222';

\echo '7. accepting twice is harmless'
select name from public.accept_invitation(:'tok');
select count(*) as membership_rows from public.workspace_members
where user_id = '22222222-2222-2222-2222-222222222222';

\echo '8. an expired invitation is refused'
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
insert into public.workspace_invitations (workspace_id, email, role, invited_by, expires_at)
values (:'ws', 'carla@example.com', 'member', auth.uid(), now() - interval '1 day');
select token as stale from public.workspace_invitations where email = 'carla@example.com' \gset
select set_config('tyriaq.test_token', :'stale', false);
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';
do $$
begin
  -- Right person this time, but the invitation is past its date.
  perform public.accept_invitation(current_setting('tyriaq.test_token'));
  raise exception 'FAIL: an expired invitation was accepted';
exception when sqlstate 'P0001' then raise notice 'PASS: %', sqlerrm;
end $$;

\echo '9. only admins can invite'
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
do $$
declare w uuid;
begin
  select workspace_id into w from public.workspace_members where user_id = auth.uid() limit 1;
  insert into public.workspace_invitations (workspace_id, email, role, invited_by)
  values (w, 'someone@else.com', 'member', auth.uid());
  raise exception 'FAIL: a plain member sent an invitation';
exception when insufficient_privilege then raise notice 'PASS: inviting needs admin';
end $$;

\echo '10. space membership: Alice adds Bob as an editor'
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
insert into public.spaces (workspace_id, name, slug, created_by)
values (:'ws', 'Marketing', 'marketing', auth.uid());
select id as sp from public.spaces where slug = 'marketing' \gset
insert into public.space_members (space_id, user_id, workspace_id, level, added_by)
values (:'sp', '22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'editor', auth.uid());
select level::text, workspace_id = :'ws' as workspace_derived from public.space_members;

\echo '11. somebody outside the workspace cannot be added to a space'
do $$
begin
  insert into public.space_members (space_id, user_id, workspace_id, level)
  select id, '33333333-3333-3333-3333-333333333333', workspace_id, 'viewer'
  from public.spaces limit 1;
  raise exception 'FAIL: an outsider was added to a space';
exception when sqlstate 'P0001' then raise notice 'PASS: %', sqlerrm;
end $$;

\echo '12. a plain member cannot change levels, but can leave'
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
do $$
declare changed int;
begin
  update public.space_members set level = 'admin' where user_id = auth.uid();
  get diagnostics changed = row_count;
  if changed > 0 then raise exception 'FAIL: he promoted himself'; end if;
  raise notice 'PASS: levels are the space admin''s to set';
end $$;
delete from public.space_members where user_id = auth.uid();
select count(*) as rows_after_leaving from public.space_members;

rollback;
