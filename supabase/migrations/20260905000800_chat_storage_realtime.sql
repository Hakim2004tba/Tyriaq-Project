-- Tyriaq — chat files and live delivery

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-files', 'chat-files', false, 26214400, null)
on conflict (id) do nothing;

-- Paths are `<workspace_id>/<conversation_id>/<uuid>.<ext>`. Access is
-- decided from the leading segment, like every other bucket here.
create policy "members read chat files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'chat-files'
    and public.is_workspace_member(nullif(split_part(name, '/', 1), '')::uuid)
  );

create policy "members upload chat files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'chat-files'
    and public.is_workspace_member(nullif(split_part(name, '/', 1), '')::uuid)
  );

create policy "members delete their chat files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'chat-files'
    and public.is_workspace_member(nullif(split_part(name, '/', 1), '')::uuid)
  );

/*
  Live delivery.

  Messages, reactions and conversations are broadcast; RLS applies to
  subscribers, so a client is only sent rows it could already read —
  which for a DM means the two people in it.

  Presence ("who is here, who is typing") is NOT a table. It is ephemeral
  by nature, and writing it to Postgres would mean a row per keystroke
  and a cleanup problem for every session that ends by closing a laptop.
  Realtime's own presence channel holds it in memory instead.
*/
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and tablename = 'messages') then
      alter publication supabase_realtime add table public.messages;
    end if;
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and tablename = 'message_reactions') then
      alter publication supabase_realtime add table public.message_reactions;
    end if;
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and tablename = 'conversations') then
      alter publication supabase_realtime add table public.conversations;
    end if;
  end if;
end $$;
