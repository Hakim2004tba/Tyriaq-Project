-- Tyriaq — profile pictures
--
-- A face beside a name is the fastest way to read a board, and the
-- product has been drawing initials for everybody because there was
-- nowhere to put a picture. `profiles.avatar_url` already existed; this
-- gives it somewhere to point.
--
-- The bucket is PUBLIC, which is a deliberate choice rather than an
-- oversight. An avatar is drawn dozens of times on one screen, by
-- <img> tags that cannot carry a session — signing each one would mean
-- a round trip per face, and a signed URL that expires mid-scroll shows
-- a broken image. The path carries a uuid, so a URL is unguessable, and
-- the only thing it reveals is a picture somebody chose to show their
-- colleagues.
--
-- Writing is not public: the path must begin with the writer's own id,
-- so nobody can replace somebody else's face.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2 * 1024 * 1024,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars are readable" on storage.objects;
create policy "avatars are readable"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

drop policy if exists "people upload their own avatar" on storage.objects;
create policy "people upload their own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    -- First path segment is the owner's id: "<uid>/<uuid>.png".
    -- split_part rather than storage.foldername() so the policy can be
    -- applied and tested outside Supabase too.
    and split_part(name, '/', 1) = (select auth.uid())::text
  );

drop policy if exists "people replace their own avatar" on storage.objects;
create policy "people replace their own avatar"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and split_part(name, '/', 1) = (select auth.uid())::text);

drop policy if exists "people delete their own avatar" on storage.objects;
create policy "people delete their own avatar"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and split_part(name, '/', 1) = (select auth.uid())::text);
