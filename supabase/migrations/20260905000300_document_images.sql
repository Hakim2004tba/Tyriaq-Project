-- Tyriaq — images inside documents
--
-- A separate bucket from task attachments: the lifecycles differ (an
-- image belongs to a body of text, not to a piece of work) and one
-- prefix per concern keeps the storage policies readable.
--
-- Private, like `task-files`. Documents render images through short-lived
-- signed URLs resolved when the page loads, so an image pasted into a
-- private document does not become a permanent public link the moment
-- somebody copies its address.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('document-images', 'document-images', false, 10485760,
        array['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'])
on conflict (id) do nothing;

-- Paths are `<workspace_id>/<document_id>/<uuid>.<ext>`, so access is the
-- same single membership question the rest of the schema asks.
create policy "members read document images"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'document-images'
    and public.is_workspace_member(nullif(split_part(name, '/', 1), '')::uuid)
  );

create policy "members upload document images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'document-images'
    and public.is_workspace_member(nullif(split_part(name, '/', 1), '')::uuid)
  );

-- Any member may remove one. Unlike an attachment, an image is part of a
-- document everybody may already edit — being able to delete the picture
-- but not the paragraph around it would be a strange half-permission.
create policy "members delete document images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'document-images'
    and public.is_workspace_member(nullif(split_part(name, '/', 1), '')::uuid)
  );
