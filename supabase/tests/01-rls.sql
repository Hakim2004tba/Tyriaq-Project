\set ON_ERROR_STOP on
\pset pager off
\set QUIET on

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com', '{"full_name":"Alice Ait"}'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com',   '{"full_name":"Bob Belkacem"}')
on conflict (id) do nothing;

begin;

\echo '1. profile trigger fired for both signups'
select count(*) as profiles, string_agg(full_name, ', ' order by full_name) as names from public.profiles;

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

\echo '2. Alice creates a workspace through the RPC'
select name, slug from public.create_workspace('Alice Co', 'alice-co');

\echo '3. she is recorded as its owner'
select role::text from public.workspace_members;

\echo '4. she can add a space to it'
insert into public.spaces (workspace_id, name, slug, created_by)
select id, 'Product', 'product', auth.uid() from public.workspaces;
select name, color::text from public.spaces;

\echo '5. a direct INSERT into workspaces is refused'
do $$ begin
  insert into public.workspaces (name, slug, created_by) values ('Sneaky','sneaky',auth.uid());
  raise exception 'FAIL: direct insert succeeded';
exception when insufficient_privilege then raise notice 'PASS: blocked by RLS';
end $$;

\echo '6. Bob sees none of it'
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select (select count(*) from public.workspaces) as workspaces,
       (select count(*) from public.workspace_members) as members,
       (select count(*) from public.spaces) as spaces;

\echo '7. Bob cannot write into her workspace even knowing its id'
do $$
declare ws uuid;
begin
  select id into ws from public.workspaces where slug = 'alice-co';
  if ws is null then
    select w.id into ws from public.workspaces w limit 1;
  end if;
  insert into public.spaces (workspace_id, name, slug, created_by)
  values (coalesce(ws, gen_random_uuid()), 'Intrusion', 'intrusion', auth.uid());
  raise exception 'FAIL: cross-workspace write succeeded';
exception
  when insufficient_privilege then raise notice 'PASS: RLS blocked the write';
  when foreign_key_violation then raise notice 'PASS: workspace id not even visible to him';
end $$;

\echo '8. slug availability answers without exposing rows'
select public.workspace_slug_available('alice-co') as taken_is_false,
       public.workspace_slug_available('bob-co') as free_is_true;

\echo '9. the last owner cannot abandon the workspace'
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
do $$ begin
  delete from public.workspace_members where user_id = auth.uid();
  raise exception 'FAIL: last owner removed';
exception when sqlstate 'P0001' then raise notice 'PASS: %', sqlerrm;
end $$;

rollback;
