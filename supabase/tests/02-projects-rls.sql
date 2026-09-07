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

\echo '1. Alice sets up a workspace, a space and a project'
select id as ws from public.create_workspace('Alice Co', 'alice-co') \gset
insert into public.spaces (workspace_id, name, slug, created_by)
values (:'ws', 'Product', 'product', auth.uid());
select id as sp from public.spaces where slug = 'product' \gset
select name, slug, status::text from public.create_project(:'sp', 'Website', 'website', 'The marketing site', 'violet');

\echo '2. she is its lead'
select role::text from public.project_members;

\echo '3. workspace_id was derived from the space, not trusted from input'
select (select workspace_id from public.projects) = :'ws' as workspace_derived_correctly;

\echo '4. she can edit status and progress fields'
update public.projects set status = 'at_risk', due_date = current_date + 30 where slug = 'website';
select status::text, (due_date is not null) as has_due from public.projects;

\echo '5. archiving is reversible and keeps the row'
update public.projects set archived_at = now() where slug = 'website';
select count(*) as still_present, count(archived_at) as archived from public.projects;
update public.projects set archived_at = null where slug = 'website';

\echo '6. a non-workspace user cannot be added to the project'
do $$
declare p uuid;
begin
  select id into p from public.projects limit 1;
  insert into public.project_members (project_id, user_id, role)
  values (p, '33333333-3333-3333-3333-333333333333', 'member');
  raise exception 'FAIL: outsider added to project';
exception when sqlstate 'P0001' then raise notice 'PASS: %', sqlerrm;
end $$;

\echo '7. Bob (different workspace) sees no projects and no roster'
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select (select count(*) from public.projects) as projects_visible,
       (select count(*) from public.project_members) as members_visible;

\echo '8. Bob cannot create a project in her space'
do $$
declare sp uuid;
begin
  select id into sp from public.spaces limit 1;
  if sp is null then
    raise notice 'PASS: her space is not even visible to him';
    return;
  end if;
  perform public.create_project(sp, 'Intrusion', 'intrusion', '', 'rose');
  raise exception 'FAIL: cross-workspace project created';
exception when sqlstate '42501' then raise notice 'PASS: %', sqlerrm;
end $$;

\echo '9. Bob cannot update her project even knowing its id'
do $$
declare updated int;
begin
  update public.projects set name = 'Hijacked' where true;
  get diagnostics updated = row_count;
  if updated > 0 then raise exception 'FAIL: % row(s) updated', updated; end if;
  raise notice 'PASS: 0 rows updatable by a non-member';
end $$;

\echo '10. project slug availability is scoped to the workspace'
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select public.project_slug_available(:'ws', 'website') as taken_is_false,
       public.project_slug_available(:'ws', 'app')     as free_is_true;

rollback;
