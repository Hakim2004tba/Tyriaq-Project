-- Tyriaq — file storage
--
-- One private bucket for every task attachment. Private, not public:
-- a public bucket hands out a permanent unguessable URL, which survives
-- being removed from a task, leaving the workspace, or losing access
-- entirely. Files are reached through short-lived signed URLs minted for
-- a caller the database has just checked.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('task-files', 'task-files', false, 26214400, null)
on conflict (id) do nothing;

/*
  Paths are `<workspace_id>/<task_id>/<uuid>.<ext>`.

  Putting the workspace first is what makes access a single question the
  existing helper already answers, with no join from an object back to a
  task. `is_workspace_member` is SECURITY DEFINER, so it works here even
  though storage.objects is a different schema.
*/
create policy "members read task files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'task-files'
    and public.is_workspace_member(nullif(split_part(name, '/', 1), '')::uuid)
  );

create policy "members upload task files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'task-files'
    and owner = auth.uid()
    and public.is_workspace_member(nullif(split_part(name, '/', 1), '')::uuid)
  );

-- No update policy: an attachment is a fixed artefact. Replacing a file
-- in place would change what everyone else already read, under the same
-- name and timestamp, with nothing in the history to show it happened.

create policy "uploaders and admins delete task files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'task-files'
    and (
      owner = auth.uid()
      or public.is_workspace_admin(nullif(split_part(name, '/', 1), '')::uuid)
    )
  );
