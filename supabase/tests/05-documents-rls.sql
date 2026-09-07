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

\echo '1. Alice sets up a workspace with Bob in it, plus a project and a task'
select id as ws from public.create_workspace('Docs Co', 'docs-co') \gset
insert into public.workspace_members (workspace_id, user_id, role)
values (:'ws', '22222222-2222-2222-2222-222222222222', 'member');
insert into public.spaces (workspace_id, name, slug, created_by)
values (:'ws', 'Product', 'product', auth.uid());
select id as sp from public.spaces where slug = 'product' \gset
select id as pj from public.create_project(:'sp', 'Website', 'website', '', 'violet') \gset
select id as t1 from public.create_task(:'pj', 'Design the hero') \gset

\echo '2. a folder, and a document inside it'
insert into public.document_folders (workspace_id, name, created_by)
values (:'ws', 'Specs', auth.uid());
select id as fld from public.document_folders where name = 'Specs' \gset
insert into public.documents (workspace_id, folder_id, title, created_by)
values (:'ws', :'fld', 'Launch plan', auth.uid());
select title, (folder_id is not null) as filed, content ->> 'type' as content_type
from public.documents;

\echo '3. a project document takes its workspace from the project'
insert into public.documents (workspace_id, project_id, title, created_by)
values ('00000000-0000-0000-0000-000000000000', :'pj', 'Website brief', auth.uid());
select title, workspace_id = :'ws' as workspace_derived
from public.documents where title = 'Website brief';

\echo '4. a body that references a task is indexed automatically'
update public.documents
set content = jsonb_build_object(
  'type', 'doc',
  'content', jsonb_build_array(
    jsonb_build_object('type', 'paragraph', 'content', jsonb_build_array(
      jsonb_build_object('type', 'text', 'text', 'Blocked on '),
      jsonb_build_object('type', 'taskLink', 'attrs', jsonb_build_object('id', :'t1'))
    ))
  )
)
where title = 'Launch plan';
select count(*) as links, (select task_id = :'t1' from public.document_task_links limit 1) as points_at_the_task
from public.document_task_links;

\echo '5. removing the reference from the body removes the link'
update public.documents set content = '{"type":"doc","content":[]}'::jsonb where title = 'Launch plan';
select count(*) as links_after_removal from public.document_task_links;

\echo '6. a plain mention of a uuid is not a task reference'
update public.documents
set content = jsonb_build_object('type','doc','content', jsonb_build_array(
  jsonb_build_object('type','paragraph','content', jsonb_build_array(
    jsonb_build_object('type','text','text', :'t1')))))
where title = 'Launch plan';
select count(*) as links_from_plain_text from public.document_task_links;

\echo '7. a document cannot be filed into another workspace''s folder'
select id as ws2 from public.create_workspace('Elsewhere', 'elsewhere') \gset
insert into public.document_folders (workspace_id, name, created_by)
values (:'ws2', 'Their specs', auth.uid());
select id as fld2 from public.document_folders where name = 'Their specs' \gset
do $$
declare d uuid; foreign_folder uuid;
begin
  select id into d from public.documents where title = 'Launch plan';
  select id into foreign_folder from public.document_folders where name = 'Their specs';
  update public.documents set folder_id = foreign_folder where id = d;
  raise exception 'FAIL: document filed into another workspace''s folder';
exception when sqlstate 'P0001' then raise notice 'PASS: %', sqlerrm;
end $$;

\echo '8. a folder cannot be moved inside itself'
do $$
declare f uuid;
begin
  select id into f from public.document_folders limit 1;
  update public.document_folders set parent_id = f where id = f;
  raise exception 'FAIL: folder became its own parent';
exception when sqlstate 'P0001' or check_violation then raise notice 'PASS: %', sqlerrm;
end $$;

\echo '9. Bob reads and edits the wiki, and archives a page'
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select count(*) as documents_visible, count(*) filter (where folder_id is not null) as in_folders
from public.documents;
update public.documents set title = 'Launch plan v2', updated_by = auth.uid() where title = 'Launch plan';
update public.documents set archived_at = now() where title = 'Website brief';
select title, (archived_at is not null) as archived from public.documents order by title;

\echo '10. but he cannot permanently delete a page Alice created'
do $$
declare removed int;
begin
  delete from public.documents;
  get diagnostics removed = row_count;
  if removed > 0 then raise exception 'FAIL: % documents deleted', removed; end if;
  raise notice 'PASS: permanent deletion is the author''s or an admin''s';
end $$;

\echo '11. and he cannot write the task-link index by hand'
do $$
declare d uuid; t uuid; w uuid;
begin
  select id, workspace_id into d, w from public.documents limit 1;
  select id into t from public.tasks limit 1;
  insert into public.document_task_links (document_id, task_id, workspace_id) values (d, t, w);
  raise exception 'FAIL: index accepted a hand-written row';
exception when insufficient_privilege then raise notice 'PASS: the index is derived, not writable';
end $$;

\echo '12. an outsider sees no documents, folders or links'
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';
select (select count(*) from public.documents) as documents,
       (select count(*) from public.document_folders) as folders,
       (select count(*) from public.document_task_links) as links;

\echo '13. and cannot create one in a workspace she is not in'
do $$
begin
  insert into public.documents (workspace_id, title, created_by)
  values ('00000000-0000-0000-0000-000000000000', 'Intruder', auth.uid());
  raise exception 'FAIL: outsider created a document';
exception
  when insufficient_privilege then raise notice 'PASS: policy refused the write';
  when foreign_key_violation then raise notice 'PASS: no such workspace to write into';
end $$;

\echo '14. document images follow the same workspace boundary'
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select id as doc from public.documents limit 1 \gset
insert into storage.objects (bucket_id, name, owner)
values ('document-images', :'ws' || '/' || :'doc' || '/pic.png', auth.uid());
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';
select count(*) as images_visible_to_outsider from storage.objects where bucket_id = 'document-images';
do $$
begin
  insert into storage.objects (bucket_id, name, owner)
  values ('document-images', '99999999-9999-9999-9999-999999999999/x/y.png', auth.uid());
  raise exception 'FAIL: outsider uploaded into the bucket';
exception when insufficient_privilege then raise notice 'PASS: storage policy refused the write';
end $$;

rollback;
