-- Tyriaq — realtime
--
-- Comments, activity and attachments are broadcast; tasks are not.
--
-- Those three are append-mostly records of what people did, where
-- another person's row appearing under yours is the entire point. A task
-- row is different: it is being dragged, typed into and optimistically
-- updated locally, and a stream of remote patches landing mid-gesture
-- would fight the person holding the mouse. Task changes still surface
-- through the activity feed, which is the honest place for them.
--
-- Realtime respects RLS for `authenticated` subscribers, so a client only
-- receives rows it could already have read.

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.task_comments;
    alter publication supabase_realtime add table public.task_activity;
    alter publication supabase_realtime add table public.task_attachments;
  end if;
end $$;

/*
  Deletes carry only the primary key by default, which is enough to drop
  a comment from a list that already holds it. Full replica identity
  would put the entire deleted row — its body included — onto the wire
  for every subscriber, so it stays off.
*/
