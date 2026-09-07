-- Tyriaq — storage policies that do not depend on which owner column
-- this Supabase version has.
--
-- The original policies asked `owner = auth.uid()`. Supabase has been
-- moving object ownership from `owner` (uuid) to `owner_id` (text), and
-- a project where `owner` is no longer populated would refuse every
-- upload — with the storage API reporting only "new row violates
-- row-level security policy", which says nothing about which column is
-- to blame.
--
-- So: uploading is gated on the path prefix alone, which is the real
-- boundary — the leading segment is the workspace, and only its members
-- may write there. Ownership then decides deletion, read from whichever
-- column this installation actually has.

drop policy if exists "members upload task files" on storage.objects;
drop policy if exists "uploaders and admins delete task files" on storage.objects;

/*
  Uploads: workspace membership, by path.

  Dropping the owner condition does not widen who may write — the same
  people could always write here — it only stops the check depending on
  a column whose meaning is in flux. Who uploaded what is recorded in
  `task_attachments.uploaded_by`, from `auth.uid()`, which is the copy
  the product actually reads.
*/
create policy "members upload task files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'task-files'
    and public.is_workspace_member(nullif(split_part(name, '/', 1), '')::uuid)
  );

do $$
declare
  owner_test text;
begin
  -- Whichever column exists is used; where both do, either matching is
  -- enough, so the policy keeps working across an upgrade in either
  -- direction rather than only after one.
  owner_test := concat_ws(' or ',
    case when exists (
      select 1 from pg_attribute
      where attrelid = 'storage.objects'::regclass and attname = 'owner' and not attisdropped
    ) then 'owner = auth.uid()' end,
    case when exists (
      select 1 from pg_attribute
      where attrelid = 'storage.objects'::regclass and attname = 'owner_id' and not attisdropped
    ) then 'owner_id = auth.uid()::text' end
  );

  if owner_test = '' then
    -- Neither column: fall back to workspace admin, so files stay
    -- removable rather than becoming permanent.
    owner_test := 'false';
  end if;

  execute format($f$
    create policy "uploaders and admins delete task files"
      on storage.objects for delete
      to authenticated
      using (
        bucket_id = 'task-files'
        and (
          (%s)
          or public.is_workspace_admin(nullif(split_part(name, '/', 1), '')::uuid)
        )
      )
  $f$, owner_test);
end $$;

notify pgrst, 'reload schema';
