-- Tyriaq — email delivery
--
-- Notifications have only ever existed inside the product. Somebody who
-- does not open Tyriaq never learns that they were mentioned, assigned
-- something, or asked to approve a join request — which makes the app
-- the only place the team can be reached, and that is a tool people stop
-- using between visits.
--
-- Two columns and a preference are all the database needs for it:
--
--   · `email_sent_at` so a digest can find what has not been sent and
--     never send it twice. Writing the timestamp is what makes the job
--     idempotent, which matters because a cron that runs twice, or
--     retries after a timeout, must not mail the same list again.
--   · `email_digest` and `email_mentions`, so this is something people
--     can turn off. Mail nobody asked for is how a product's messages
--     end up in spam permanently.

alter table public.notifications
  add column if not exists email_sent_at timestamptz;

/*
  Partial: the job only ever looks for rows that have NOT been emailed,
  and once a workspace has been running for a year that is a small
  fraction of the table.
*/
create index if not exists notifications_unsent_idx
  on public.notifications (user_id, created_at)
  where email_sent_at is null;

alter table public.notification_preferences
  add column if not exists email_digest boolean not null default true;

alter table public.notification_preferences
  add column if not exists email_mentions boolean not null default true;

comment on column public.notification_preferences.email_digest is
  'A daily summary of everything unread.';
comment on column public.notification_preferences.email_mentions is
  'Mail the moment somebody names you, rather than waiting for the digest.';

/*
  A row per person, so a preference can be read without one existing.

  `notification_preferences` is written the first time somebody changes
  a setting, which means most people have no row at all — and "no row"
  has to mean "everything on", not "nothing on". Callers read through
  this instead of joining and coalescing in five places.
*/
create or replace function public.email_preferences(p_user uuid, p_workspace uuid)
returns table (digest boolean, mentions boolean, muted public.notification_kind[])
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce(p.email_digest, true),
    coalesce(p.email_mentions, true),
    coalesce(p.muted_kinds, '{}'::public.notification_kind[])
  from (select 1) as _
  left join public.notification_preferences p
    on p.user_id = p_user and p.workspace_id = p_workspace;
$$;

grant execute on function public.email_preferences(uuid, uuid) to authenticated;
