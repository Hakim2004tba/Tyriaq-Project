-- Tyriaq — email delivery.
--
-- Run this in the Supabase SQL editor: select all, press Run.
-- Safe to run more than once.
--
-- Notifications have only ever existed inside the product. This adds
-- what the database needs to send them by mail: a stamp so a digest
-- never mails the same row twice, and two preferences so people can
-- turn it off.
--
-- Nothing sends yet after running this. The app needs RESEND_API_KEY
-- (and, for the daily digest, SUPABASE_SERVICE_ROLE_KEY and CRON_SECRET)
-- in its environment variables — see docs/EMAIL.md.

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

notify pgrst, 'reload schema';
