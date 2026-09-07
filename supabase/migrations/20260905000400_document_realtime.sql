-- Tyriaq — documents on the realtime channel
--
-- Only so an open editor can be TOLD that somebody else saved. The
-- payload is not applied to the page: without a merge strategy, applying
-- a remote body would throw away whatever the reader has typed since.
--
-- This is the honest half of collaborative editing that the current
-- architecture can support — detecting a conflict — as distinct from
-- resolving one, which needs a CRDT and a server that can merge.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'documents'
    ) then
      alter publication supabase_realtime add table public.documents;
    end if;
  end if;
end $$;
